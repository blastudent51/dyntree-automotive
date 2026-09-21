import { describe, it, expect, vi, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
vi.mock("../lib/email-delivery", () => ({ scheduleEmailDelivery: vi.fn() }));
const cookieJar = vi.hoisted(() => ({ value: "" }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (cookieJar.value ? { value: cookieJar.value } : undefined),
    set: (_name: string, v: string) => {
      cookieJar.value = v;
    },
    delete: () => {
      cookieJar.value = "";
    },
  }),
}));
import { createDevSession } from "../lib/auth";
import { getDb } from "../lib/db";
import {
  POST as saveConfiguration,
  DELETE as deleteConfiguration,
} from "../app/api/configurations/route";
import { GET as getAccount } from "../app/api/account/route";
import { POST as checkout } from "../app/api/checkout/route";
import {
  GET as adminList,
  POST as adminUpdate,
} from "../app/api/admin/[resource]/route";
import { POST as refund } from "../app/api/admin/reservations/[id]/refund/route";
import { POST as webhook } from "../app/api/stripe/webhook/route";
const enabled = process.env.RUN_DB_TESTS === "true";
const db = enabled ? getDb() : null;
const request = (url: string, body: unknown, method = "POST") =>
  new Request(`http://localhost:3000${url}`, {
    method,
    headers: {
      origin: "http://localhost:3000",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
afterAll(async () => {
  vi.unstubAllEnvs();
  if (db) await db.$disconnect();
});
describe.skipIf(!enabled)(
  "Authenticated API flows against isolated development Postgres",
  () => {
    it("enforces ownership, records a simulated reservation, updates status and refunds without collecting funds", async () => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("DEV_AUTH_ENABLED", "true");
      vi.stubEnv("DEV_PAYMENT_SIMULATION", "true");
      vi.stubEnv("STRIPE_SECRET_KEY", "");
      vi.stubEnv("CLERK_SECRET_KEY", "");
      const customer = await db!.user.findUniqueOrThrow({
        where: { email: "customer@example.com" },
      });
      const admin = await db!.user.findUniqueOrThrow({
        where: { email: "admin@example.com" },
      });
      const customerToken = await createDevSession(customer.id);
      const adminToken = await createDevSession(admin.id);
      cookieJar.value = "";
      expect((await getAccount()).status).toBe(401);
      cookieJar.value = customerToken;
      expect(
        (
          await adminList(
            new Request("http://localhost:3000/api/admin/users"),
            {
              params: Promise.resolve({ resource: "users" }),
            },
          )
        ).status,
      ).toBe(403);
      const configuration = {
        trim: "multiply",
        paint: "volt-blue",
        wheels: "performance20",
        interior: "multiply-sport",
        packages: [],
        accessories: ["cargo-liner"],
        purchasePreference: {
          method: "lease",
          termMonths: 36,
          downPercent: 5,
          annualMiles: 12000,
        },
      };
      const savedResponse = await saveConfiguration(
        request("/api/configurations", {
          name: "API verification M1E",
          configuration,
        }),
      );
      expect(savedResponse.status).toBe(201);
      const saved = (await savedResponse.json()) as {
        id: string;
        code: string;
      };
      expect(saved.code).toMatch(/^M1E-/);
      cookieJar.value = adminToken;
      expect(
        (
          await deleteConfiguration(
            request("/api/configurations", { id: saved.id }, "DELETE"),
          )
        ).status,
      ).toBe(404);
      cookieJar.value = customerToken;
      const address = {
        line1: "100 Test Way",
        line2: "",
        city: "Test City",
        state: "LA",
        postalCode: "70000",
        country: "US",
      };
      const key = randomUUID();
      const body = {
        configuration,
        firstName: "Jordan",
        lastName: "Demo",
        email: "customer@example.com",
        phone: "2025550100",
        billingAddress: address,
        deliveryAddress: address,
        agreement: true,
        agreementVersion: "2026-09-19",
        idempotencyKey: key,
      };
      const payment = await checkout(request("/api/checkout", body));
      expect(payment.status).toBe(200);
      const result = (await payment.json()) as {
        simulated: boolean;
        url: string;
      };
      expect(result.simulated).toBe(true);
      expect(result.url).toContain("DYN-M1E-");
      const retry = await checkout(request("/api/checkout", body));
      expect(retry.status).toBe(200);
      const records = await db!.reservation.findMany({
        where: { idempotencyKey: `${customer.id}:${key}` },
        include: { snapshot: true },
      });
      expect(records).toHaveLength(1);
      const reservation = records[0];
      expect(reservation.snapshot?.configuration).toEqual(configuration);
      expect(reservation.simulated).toBe(true);
      expect(reservation.depositCents).toBe(25000);
      const savedPricing = reservation.snapshot?.pricing as {
        purchaseEstimate: {
          method: string;
          preference: unknown;
          priceCents: number;
        };
      };
      expect(savedPricing.purchaseEstimate.method).toBe("lease");
      expect(savedPricing.purchaseEstimate.preference).toEqual(
        configuration.purchasePreference,
      );
      expect(savedPricing.purchaseEstimate.priceCents).toBe(
        reservation.snapshot?.estimatedPriceCents,
      );
      const savedBuild = await db!.savedConfiguration.findUniqueOrThrow({
        where: { id: saved.id },
      });
      expect(savedBuild.configuration).toEqual(configuration);
      cookieJar.value = adminToken;
      const update = await adminUpdate(
        request("/api/admin/reservations", {
          id: reservation.id,
          data: {
            status: "AWAITING_PRODUCTION",
            note: "Development test status update. No production date promised.",
          },
        }),
        { params: Promise.resolve({ resource: "reservations" }) },
      );
      expect(update.status).toBe(200);
      const back = await adminUpdate(
        request("/api/admin/reservations", {
          id: reservation.id,
          data: { status: "RESERVED", note: "Invalid backwards update test" },
        }),
        { params: Promise.resolve({ resource: "reservations" }) },
      );
      expect(back.status).toBe(409);
      const refundBody = {
        amountCents: 25000,
        reason: "Automated development-only verification",
        confirmation: "REFUND",
        idempotencyKey: randomUUID(),
      };
      const refunded = await refund(
        request("/api/admin/reservations/refund", refundBody),
        {
          params: Promise.resolve({ id: reservation.id }),
        },
      );
      expect(refunded.status).toBe(200);
      expect(
        (
          await refund(request("/api/admin/reservations/refund", refundBody), {
            params: Promise.resolve({ id: reservation.id }),
          })
        ).status,
      ).toBe(200);
      const final = await db!.reservation.findUniqueOrThrow({
        where: { id: reservation.id },
        include: { refunds: true },
      });
      expect(final.status).toBe("CANCELLED");
      expect(final.paymentStatus).toBe("REFUNDED");
      expect(final.refunds).toHaveLength(1);
      expect(
        await db!.adminAuditLog.count({
          where: { target: `reservation:${reservation.id}` },
        }),
      ).toBe(2);
      cookieJar.value = customerToken;
      expect((await getAccount()).status).toBe(200);
    }, 90000);
    it("rejects Stripe deliveries without a valid signature", async () => {
      const response = await webhook(
        new Request("http://localhost:3000/api/stripe/webhook", {
          method: "POST",
          body: '{"type":"payment_intent.succeeded"}',
        }),
      );
      expect(response.status).toBe(400);
    });
  },
);
