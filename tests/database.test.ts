import { describe, it, expect, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { getDb } from '../lib/db';
import { finalizeReservation, handleStripeEvent } from '../lib/payments';
import { seedCatalog } from '../lib/seed-catalog';
import { defaultConfiguration, priceConfiguration } from '../lib/configuration';
import { Prisma } from '@prisma/client';
import type Stripe from 'stripe';
const enabled = process.env.RUN_DB_TESTS === 'true';
const db = enabled ? getDb() : null;
afterAll(async () => {
  if (db) await db.$disconnect();
});
describe.skipIf(!enabled)(
  'PostgreSQL reservation integrity (isolated development database)',
  () => {
    it('keeps exactly one reservation number and payment under concurrent confirmations', async () => {
      const user = await db!.user.findUniqueOrThrow({ where: { email: 'customer@example.com' } });
      const config = defaultConfiguration(seedCatalog);
      const price = priceConfiguration(seedCatalog, config);
      const record = await db!.reservation.create({
        data: {
          userId: user.id,
          idempotencyKey: `test:${randomUUID()}`,
          depositCents: 25000,
          refundable: true,
          customer: { firstName: 'Test', email: 'customer@example.com' },
          billingAddress: { test: true },
          deliveryAddress: { test: true },
          agreementVersion: 'test-only',
          agreementAcceptedAt: new Date(),
          snapshot: {
            create: {
              vehicleName: 'Test M1E',
              configuration: config,
              pricing: price as unknown as Prisma.InputJsonValue,
              estimatedPriceCents: price.totalCents,
              terms: { test: true },
            },
          },
        },
      });
      const intent = `test_sim_${record.id}`;
      const results = await Promise.all([
        db!.$transaction((tx) => finalizeReservation(tx, record.id, intent, 25000, 'usd', true)),
        db!.$transaction((tx) => finalizeReservation(tx, record.id, intent, 25000, 'usd', true)),
      ]);
      expect(results[0].number).toMatch(/^DYN-M1E-\d{6,}$/);
      expect(results[0].number).toBe(results[1].number);
      expect(await db!.payment.count({ where: { reservationId: record.id } })).toBe(1);
      expect(
        await db!.orderStatusHistory.count({
          where: { reservationId: record.id, status: 'RESERVED' },
        }),
      ).toBe(1);
      expect(await db!.emailOutbox.count({ where: { dedupeKey: `reserved:${record.id}` } })).toBe(
        1,
      );
      await expect(
        db!.reservationConfigurationSnapshot.update({
          where: { reservationId: record.id },
          data: { estimatedPriceCents: 1 },
        }),
      ).rejects.toThrow();
      const snapshot = await db!.reservationConfigurationSnapshot.findUniqueOrThrow({
        where: { reservationId: record.id },
      });
      expect(snapshot.estimatedPriceCents).toBe(5299000);
      await expect(
        db!.$transaction((tx) => finalizeReservation(tx, record.id, intent, 1, 'usd', true)),
      ).rejects.toThrow('Payment does not match');
    });
    it('processes one webhook event once even when redelivered', async () => {
      const event = {
        id: `evt_test_${randomUUID()}`,
        type: 'payment_intent.payment_failed',
        data: { object: { id: 'pi_test_unlinked', metadata: {} } },
      } as unknown as Stripe.Event;
      const first = await handleStripeEvent(event);
      const second = await handleStripeEvent(event);
      expect(first.received).toBe(true);
      expect(second).toEqual({ received: true, duplicate: true });
      expect(await db!.webhookEvent.count({ where: { providerEventId: event.id } })).toBe(1);
    });
    it('reconciles an admin refund callback once and preserves a full refund after an older partial event', async () => {
      const user = await db!.user.findUniqueOrThrow({ where: { email: 'customer@example.com' } });
      const record = await db!.reservation.create({
        data: {
          userId: user.id,
          idempotencyKey: `refund-test:${randomUUID()}`,
          depositCents: 25000,
          refundable: true,
          customer: { firstName: 'Test', email: user.email },
          billingAddress: { test: true },
          deliveryAddress: { test: true },
          agreementVersion: 'test-only',
          agreementAcceptedAt: new Date(),
        },
      });
      const intent = `test_refund_${record.id}`;
      await db!.$transaction((tx) =>
        finalizeReservation(tx, record.id, intent, 25000, 'usd', true),
      );
      const local = await db!.refund.create({
        data: {
          reservationId: record.id,
          idempotencyKey: `test-local:${randomUUID()}`,
          amountCents: 10000,
          reason: 'Development verification',
        },
      });
      const firstRefund = {
        id: `re_test_${randomUUID()}`,
        amount: 10000,
        status: 'succeeded',
        metadata: { localRefundId: local.id },
      };
      const secondRefund = {
        id: `re_test_${randomUUID()}`,
        amount: 15000,
        status: 'succeeded',
        metadata: {},
      };
      const event = (amount: number, refunds: unknown[]) =>
        ({
          id: `evt_test_${randomUUID()}`,
          type: 'charge.refunded',
          data: {
            object: {
              id: `ch_test_${record.id}`,
              payment_intent: intent,
              amount_refunded: amount,
              refunds: { data: refunds },
            },
          },
        }) as unknown as Stripe.Event;
      await handleStripeEvent(event(25000, [firstRefund, secondRefund]));
      await handleStripeEvent(event(10000, [firstRefund]));
      const final = await db!.reservation.findUniqueOrThrow({
        where: { id: record.id },
        include: { refunds: true },
      });
      expect(final.paymentStatus).toBe('REFUNDED');
      expect(final.status).toBe('CANCELLED');
      expect(final.refunds).toHaveLength(2);
      expect(final.refunds.find((refund) => refund.id === local.id)?.providerRefundId).toBe(
        firstRefund.id,
      );
      expect(
        await db!.orderStatusHistory.count({
          where: { reservationId: record.id, status: 'CANCELLED' },
        }),
      ).toBe(1);
      expect(
        await db!.emailOutbox.count({
          where: { dedupeKey: { in: [`refund:${firstRefund.id}`, `refund:${secondRefund.id}`] } },
        }),
      ).toBe(2);
    });
  },
);
