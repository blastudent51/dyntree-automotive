import { describe, it, expect, vi, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
const mock = vi.hoisted(() => ({
  stripe: {
    prices: { retrieve: vi.fn() },
    customers: { create: vi.fn() },
    checkout: { sessions: { create: vi.fn(), retrieve: vi.fn() } },
    subscriptions: { retrieve: vi.fn() },
    invoices: { retrieve: vi.fn() },
    billingPortal: {
      configurations: { retrieve: vi.fn() },
      sessions: { create: vi.fn() },
    },
  },
  actor: { id: "", role: "CUSTOMER" },
}));
vi.mock("../lib/payments", () => ({ stripeClient: () => mock.stripe }));
vi.mock("../lib/auth", () => ({
  requireUser: async () => mock.actor,
  requireAdmin: async () => {
    if (mock.actor.role !== "ADMIN") throw Error("Not admin");
    return mock.actor;
  },
}));
import { getDb } from "../lib/db";
import {
  inviteSubscription,
  handleSubscriptionEvent,
  subscriptionPortal,
} from "../lib/subscriptions";
import { POST as checkout } from "../app/api/subscriptions/checkout/route";
const enabled = process.env.RUN_DB_TESTS === "true";
const db = enabled ? getDb() : null;
afterAll(async () => {
  vi.unstubAllEnvs();
  if (db) await db.$disconnect();
});
describe.skipIf(!enabled)(
  "subscription lifecycle with isolated Postgres and mocked Stripe transport",
  () => {
    it("keeps ownership, recurring billing, invoices, cancellation and reservation funds separate", async () => {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
      vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fixture");
      vi.stubEnv("STRIPE_BILLING_PORTAL_CONFIGURATION_ID", "bpc_test_fixture");
      const user = await db!.user.findUniqueOrThrow({
        where: { email: "customer@example.com" },
      });
      const admin = await db!.user.findUniqueOrThrow({
        where: { email: "admin@example.com" },
      });
      await db!.siteSetting.upsert({
        where: { key: "vehicle-subscriptions" },
        create: {
          key: "vehicle-subscriptions",
          value: {
            enabled: true,
            termsVersion: "test-v1",
            terms:
              "Test-only vehicle subscription terms for an isolated database fixture. Mileage, insurance, returns and cancellation are illustrative here. No real vehicle service or charge is created.",
            automaticTax: false,
          },
        },
        update: {
          value: {
            enabled: true,
            termsVersion: "test-v1",
            terms:
              "Test-only vehicle subscription terms for an isolated database fixture. Mileage, insurance, returns and cancellation are illustrative here. No real vehicle service or charge is created.",
            automaticTax: false,
          },
        },
      });
      const reservation = await db!.reservation.create({
        data: {
          userId: user.id,
          number: `DYN-M1E-${parseInt(randomUUID().replaceAll("-", "").slice(0, 10), 16)}`,
          status: "READY_TO_SHIP",
          paymentStatus: "PAID",
          depositCents: 25000,
          refundable: true,
          idempotencyKey: randomUUID(),
          customer: { test: true },
          billingAddress: { test: true },
          deliveryAddress: { test: true },
          agreementVersion: "test",
          agreementAcceptedAt: new Date(),
        },
      });
      const price = {
        id: `price_${randomUUID().replaceAll("-", "")}`,
        active: true,
        type: "recurring",
        currency: "usd",
        unit_amount: 90000,
        livemode: false,
        recurring: {
          interval: "month",
          interval_count: 1,
          usage_type: "licensed",
        },
        billing_scheme: "per_unit",
        tax_behavior: "exclusive",
      };
      mock.stripe.prices.retrieve.mockResolvedValue(price);
      mock.stripe.billingPortal.configurations.retrieve.mockResolvedValue({
        active: true,
        features: {
          subscription_cancel: { enabled: true, mode: "at_period_end" },
          payment_method_update: { enabled: true },
          invoice_history: { enabled: true },
          subscription_update: { enabled: false },
        },
      });
      const record = await inviteSubscription(
        admin.id,
        reservation.number!,
        price.id,
      );
      await expect(
        inviteSubscription(admin.id, reservation.number!, price.id),
      ).rejects.toThrow();
      mock.actor = { id: user.id, role: "CUSTOMER" };
      const req = (data: unknown) =>
        new Request("http://localhost:3000/api/subscriptions/checkout", {
          method: "POST",
          headers: {
            origin: "http://localhost:3000",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });
      const body = {
        id: record.id,
        termsVersion: record.termsVersion,
        agree: true,
      };
      expect((await checkout(req({ ...body, monthlyCents: 1 }))).status).toBe(
        400,
      );
      expect((await checkout(req({ ...body, agree: false }))).status).toBe(400);
      mock.actor = { id: admin.id, role: "ADMIN" };
      expect((await checkout(req(body))).status).toBe(404);
      mock.actor = { id: user.id, role: "CUSTOMER" };
      const customer = `cus_${record.id}`;
      const session = `cs_${record.id}`;
      mock.stripe.customers.create.mockResolvedValue({ id: customer });
      mock.stripe.checkout.sessions.create.mockResolvedValue({
        id: session,
        url: "https://checkout.stripe.com/c/pay/test",
        status: "open",
      });
      mock.stripe.checkout.sessions.retrieve.mockResolvedValue({
        id: session,
        url: "https://checkout.stripe.com/c/pay/test",
        status: "open",
      });
      expect((await checkout(req(body))).status).toBe(200);
      expect((await checkout(req(body))).status).toBe(200);
      expect(mock.stripe.checkout.sessions.create).toHaveBeenCalledTimes(1);
      expect(
        mock.stripe.checkout.sessions.create.mock.calls[0][0],
      ).toMatchObject({
        mode: "subscription",
        line_items: [{ price: price.id, quantity: 1 }],
        customer,
      });
      const invoice = {
        id: `in_${record.id}`,
        customer,
        status: "paid",
        amount_due: 90000,
        amount_paid: 90000,
        currency: "usd",
        parent: { subscription_details: { subscription: `sub_${record.id}` } },
      };
      const sub = {
        id: `sub_${record.id}`,
        metadata: { dyntreeBillingId: record.id, userId: user.id },
        customer,
        livemode: false,
        status: "active",
        cancel_at_period_end: false,
        items: {
          data: [
            {
              price: { id: price.id },
              quantity: 1,
              current_period_end: 1800000000,
            },
          ],
        },
        latest_invoice: invoice,
      };
      mock.stripe.subscriptions.retrieve.mockImplementation(async () =>
        structuredClone(sub),
      );
      mock.stripe.invoices.retrieve.mockImplementation(async () =>
        structuredClone(invoice),
      );
      const event = (type: string, object: unknown) =>
        ({
          id: `evt_${randomUUID()}`,
          type,
          livemode: false,
          data: { object },
        }) as Stripe.Event;
      const paid = event("invoice.paid", invoice);
      expect(await handleSubscriptionEvent(paid)).toEqual({ received: true });
      expect(await handleSubscriptionEvent(paid)).toEqual({
        received: true,
        duplicate: true,
      });
      expect(
        await db!.subscriptionInvoice.count({
          where: { vehicleSubscriptionId: record.id },
        }),
      ).toBe(1);
      expect(
        await db!.payment.count({ where: { reservationId: reservation.id } }),
      ).toBe(0);
      expect(
        (
          await db!.reservation.findUniqueOrThrow({
            where: { id: reservation.id },
          })
        ).depositCents,
      ).toBe(25000);
      invoice.status = "open";
      invoice.amount_paid = 0;
      sub.status = "past_due";
      await handleSubscriptionEvent(event("invoice.payment_failed", invoice));
      expect(
        (
          await db!.vehicleSubscription.findUniqueOrThrow({
            where: { id: record.id },
          })
        ).status,
      ).toBe("PAST_DUE");
      invoice.status = "paid";
      invoice.amount_paid = 90000;
      sub.status = "active";
      await handleSubscriptionEvent(event("invoice.paid", invoice));
      await handleSubscriptionEvent(
        event("invoice.payment_failed", {
          ...invoice,
          status: "open",
          amount_paid: 0,
        }),
      );
      expect(
        (
          await db!.subscriptionInvoice.findUniqueOrThrow({
            where: { stripeInvoiceId: invoice.id },
          })
        ).status,
      ).toBe("paid");
      sub.cancel_at_period_end = true;
      await handleSubscriptionEvent(
        event("customer.subscription.updated", sub),
      );
      expect(
        (
          await db!.vehicleSubscription.findUniqueOrThrow({
            where: { id: record.id },
          })
        ).cancelAtPeriodEnd,
      ).toBe(true);
      sub.status = "canceled";
      await handleSubscriptionEvent(
        event("customer.subscription.deleted", sub),
      );
      await handleSubscriptionEvent(
        event("customer.subscription.updated", { ...sub, status: "active" }),
      );
      expect(
        (
          await db!.vehicleSubscription.findUniqueOrThrow({
            where: { id: record.id },
          })
        ).status,
      ).toBe("CANCELED");
      await expect(
        db!.vehicleSubscription.update({
          where: { id: record.id },
          data: { monthlyCents: 1 },
        }),
      ).rejects.toThrow();
      await db!.siteSetting.update({
        where: { key: "vehicle-subscriptions" },
        data: {
          value: {
            enabled: false,
            termsVersion: "test-v1",
            terms: "",
            automaticTax: false,
          },
        },
      });
      mock.stripe.billingPortal.sessions.create.mockResolvedValue({
        url: "https://billing.stripe.com/p/session/test",
      });
      await expect(subscriptionPortal(admin.id, record.id)).rejects.toThrow();
      expect((await subscriptionPortal(user.id, record.id)).url).toContain(
        "billing.stripe.com",
      );
      expect(mock.stripe.billingPortal.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({ customer }),
      );
    }, 180000);
  },
);
