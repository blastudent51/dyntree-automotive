import { describe, it, expect, vi, afterEach } from "vitest";
import type Stripe from "stripe";
import {
  assertSubscriptionMode,
  validateMonthlyPrice,
} from "../lib/subscriptions";
import {
  subscriptionSettingsSchema,
  defaultSubscriptionSettings,
} from "../lib/subscription-settings";
afterEach(() => vi.unstubAllEnvs());
const price = {
  active: true,
  type: "recurring",
  currency: "usd",
  unit_amount: 90000,
  recurring: { interval: "month", interval_count: 1, usage_type: "licensed" },
  billing_scheme: "per_unit",
  transform_quantity: null,
  tax_behavior: "exclusive",
} as Stripe.Price;
describe("monthly subscription security", () => {
  it("accepts flat monthly prices and rejects yearly, metered, inactive and undefined-tax prices", () => {
    expect(validateMonthlyPrice(price)).toBe(90000);
    for (const value of [
      { ...price, active: false },
      { ...price, currency: "eur" },
      { ...price, unit_amount: null },
      { ...price, tax_behavior: "unspecified" },
      { ...price, recurring: { ...price.recurring, interval: "year" } },
      { ...price, recurring: { ...price.recurring, usage_type: "metered" } },
    ])
      expect(() => validateMonthlyPrice(value as Stripe.Price)).toThrow();
  });
  it("blocks environment mismatches and requires explicit live opt-in", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fixture");
    expect(() => assertSubscriptionMode(true)).toThrow();
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_fixture");
    vi.stubEnv("ENABLE_VEHICLE_SUBSCRIPTIONS", "false");
    expect(() => assertSubscriptionMode(true)).toThrow();
    vi.stubEnv("ENABLE_VEHICLE_SUBSCRIPTIONS", "true");
    expect(() => assertSubscriptionMode(true)).not.toThrow();
  });
  it("ships disabled and requires terms before activation", () => {
    expect(defaultSubscriptionSettings.enabled).toBe(false);
    expect(() =>
      subscriptionSettingsSchema.parse({
        ...defaultSubscriptionSettings,
        enabled: true,
      }),
    ).toThrow();
  });
});
