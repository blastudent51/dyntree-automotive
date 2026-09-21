import Stripe from 'stripe';
import { Prisma } from '@prisma/client';
import { getDb } from './db';
import { HttpError, jsonValue, localSimulationEnabled } from './security';
export function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !process.env.STRIPE_WEBHOOK_SECRET)
    throw new HttpError(
      503,
      'Reservations are not accepting payments yet. Please save your configuration.',
    );
  if (key.startsWith('sk_live_') && process.env.ENABLE_LIVE_PAYMENTS !== 'true')
    throw new HttpError(503, 'Live reservations are not enabled.');
  return new Stripe(key, { maxNetworkRetries: 2, timeout: 15000 });
}
export async function finalizeReservation(
  tx: Prisma.TransactionClient,
  id: string,
  intentId: string,
  amount: number,
  currency: string,
  simulated = false,
) {
  await tx.$queryRaw`SELECT id FROM "Reservation" WHERE id=${id}::uuid FOR UPDATE`;
  const reservation = await tx.reservation.findUnique({ where: { id } });
  if (!reservation) throw new HttpError(404, 'Reservation not found.');
  if (reservation.depositCents !== amount || reservation.currency !== currency)
    throw new HttpError(400, 'Payment does not match the reservation.');
  if (!simulated && reservation.paymentProvider !== 'stripe') throw new HttpError(409, 'Payment provider mismatch.');
  if (reservation.paymentIntentId && reservation.paymentIntentId !== intentId) throw new HttpError(409, 'Reservation already has another payment.');
  if (reservation.paymentStatus !== 'PENDING') {
    if (reservation.paymentIntentId !== intentId)
      throw new HttpError(409, 'Reservation already has another payment.');
    return reservation;
  }
  const claimed = await tx.reservation.updateMany({
    where: { id, paymentStatus: 'PENDING' },
    data: { paymentStatus: 'PAID', paymentIntentId: intentId },
  });
  if (!claimed.count) return tx.reservation.findUniqueOrThrow({ where: { id } });
  const count = await tx.counter.upsert({
    where: { id: 'reservation' },
    create: { id: 'reservation', value: 1 },
    update: { value: { increment: 1 } },
  });
  const number = `DYN-M1E-${String(count.value).padStart(6, '0')}`;
  const updated = await tx.reservation.update({
    where: { id },
    data: { number, status: 'RESERVED', simulated, ...(simulated ? { paymentProvider: 'simulation' } : {}) },
  });
  await tx.payment.upsert({
    where: { providerPaymentIntentId: intentId },
    create: {
      providerPaymentIntentId: intentId,
      reservationId: id,
      amountCents: amount,
      currency,
      status: 'SUCCEEDED',
    },
    update: { status: 'SUCCEEDED' },
  });
  await tx.orderStatusHistory.create({
    data: {
      reservationId: id,
      status: 'RESERVED',
      note: simulated
        ? 'Development payment simulation completed. No funds collected.'
        : 'Reservation payment confirmed.',
    },
  });
  const customer = reservation.customer as { email: string; firstName: string };
  await tx.emailOutbox.upsert({
    where: { dedupeKey: `reserved:${id}` },
    create: {
      dedupeKey: `reserved:${id}`,
      recipient: customer.email,
      template: 'reservation-confirmation',
      payload: jsonValue({ name: customer.firstName, number, amountCents: amount, simulated }),
    },
    update: {},
  });
  return updated;
}
export async function simulateReservation(id: string) {
  if (!localSimulationEnabled()) throw new HttpError(404, 'Not found.');
  return getDb().$transaction(async (tx) => {
    const r = await tx.reservation.findUniqueOrThrow({ where: { id } });
    return finalizeReservation(tx, id, `sim_${id}`, r.depositCents, r.currency, true);
  });
}
export async function handleStripeEvent(event: Stripe.Event) {
  const db = getDb();
  // Stripe may deliver a refund before the payment-success event. Reconcile the
  // original payment outside the database transaction before applying the refund.
  let refundedIntent: Stripe.PaymentIntent | null = null;
  if (event.type === 'charge.refunded') {
    const charge = event.data.object;
    const intentId =
      typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
    if (intentId && !(await db.reservation.findUnique({ where: { paymentIntentId: intentId } }))) {
      refundedIntent = await stripeClient().paymentIntents.retrieve(intentId);
    }
  }
  try {
    return await db.$transaction(async (tx) => {
      await tx.webhookEvent.create({ data: { providerEventId: event.id, type: event.type } });
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        if (session.payment_status === 'paid' && session.metadata?.reservationId) {
          const intent =
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : session.payment_intent?.id;
          if (!intent) throw new Error('Missing payment intent.');
          const r = await tx.reservation.findUnique({
            where: { id: session.metadata.reservationId },
          });
          if (!r || r.legacyCheckoutSessionId !== session.id) throw new Error('Session mismatch.');
          await finalizeReservation(
            tx,
            r.id,
            intent,
            session.amount_total || 0,
            session.currency || '',
          );
        }
      }
      if (event.type === 'payment_intent.succeeded') {
        const intent = event.data.object;
        if (intent.metadata?.reservationId)
          await finalizeReservation(
            tx,
            intent.metadata.reservationId,
            intent.id,
            intent.amount_received,
            intent.currency,
          );
      }
      if (event.type === 'payment_intent.payment_failed') {
        const intent = event.data.object;
        if (intent.metadata?.reservationId) {
          const r = await tx.reservation.findUnique({
            where: { id: intent.metadata.reservationId },
          });
          if (r && r.paymentStatus === 'PENDING') {
            await tx.payment.upsert({
              where: { providerPaymentIntentId: intent.id },
              create: {
                providerPaymentIntentId: intent.id,
                reservationId: r.id,
                amountCents: intent.amount,
                currency: intent.currency,
                status: 'FAILED',
              },
              update: { status: 'FAILED' },
            });
          }
        }
      }
      if (event.type === 'charge.refunded') {
        const charge = event.data.object;
        const intent =
          typeof charge.payment_intent === 'string'
            ? charge.payment_intent
            : charge.payment_intent?.id;
        if (intent) {
          let r = await tx.reservation.findUnique({ where: { paymentIntentId: intent } });
          if (
            !r &&
            refundedIntent?.metadata?.reservationId &&
            refundedIntent.status === 'succeeded'
          ) {
            r = await finalizeReservation(
              tx,
              refundedIntent.metadata.reservationId,
              intent,
              refundedIntent.amount_received,
              refundedIntent.currency,
            );
          }
          if (r && (r.paymentProvider === 'stripe' || r.simulated)) {
            const full = r.paymentStatus === 'REFUNDED' || charge.amount_refunded >= r.depositCents;
            await tx.reservation.update({
              where: { id: r.id },
              data: {
                paymentStatus: full ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
                ...(full ? { status: 'CANCELLED' as const } : {}),
              },
            });
            for (const refund of charge.refunds?.data || []) {
              const localId = refund.metadata?.localRefundId;
              const local = localId
                ? await tx.refund.findFirst({ where: { id: localId, reservationId: r.id } })
                : null;
              if (local) {
                await tx.refund.update({
                  where: { id: local.id },
                  data: { providerRefundId: refund.id, status: refund.status || 'succeeded' },
                });
              } else {
                await tx.refund.upsert({
                  where: { providerRefundId: refund.id },
                  create: {
                    providerRefundId: refund.id,
                    idempotencyKey: `stripe:${refund.id}`,
                    reservationId: r.id,
                    amountCents: refund.amount,
                    reason: refund.reason || 'Stripe refund',
                    status: refund.status || 'succeeded',
                  },
                  update: { status: refund.status || 'succeeded' },
                });
              }
            }
            if (full) {
              const exists = await tx.orderStatusHistory.findFirst({
                where: { reservationId: r.id, status: 'CANCELLED' },
              });
              if (!exists)
                await tx.orderStatusHistory.create({
                  data: {
                    reservationId: r.id,
                    status: 'CANCELLED',
                    note: 'Reservation payment refunded.',
                  },
                });
            }
            const customer = r.customer as { email: string; firstName: string };
            for (const refund of charge.refunds?.data || []) {
              if (refund.status !== 'succeeded') continue;
              await tx.emailOutbox.upsert({
                where: { dedupeKey: `refund:${refund.id}` },
                create: {
                  dedupeKey: `refund:${refund.id}`,
                  recipient: customer.email,
                  template: 'refund-confirmation',
                  payload: jsonValue({
                    name: customer.firstName,
                    number: r.number,
                    amountCents: refund.amount,
                  }),
                },
                update: {},
              });
            }
          }
        }
      }
      return { received: true };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const seen = await db.webhookEvent.findUnique({ where: { providerEventId: event.id } });
      if (seen) return { received: true, duplicate: true };
    }
    throw error;
  }
}
