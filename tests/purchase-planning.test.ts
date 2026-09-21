import { describe, it, expect } from "vitest";
import {
  defaultPurchaseSettings,
  estimatePurchase,
  purchasePreferenceSchema,
  purchaseSettingsSchema,
} from "../lib/purchase-planning";
import {
  configurationFromQuery,
  configurationQuery,
  defaultConfiguration,
  priceConfiguration,
} from "../lib/configuration";
import { seedCatalog } from "../lib/seed-catalog";
describe("ownership planning", () => {
  it("amortizes an independently calculated $30,000 / 6% / 60 month loan", () => {
    const q = estimatePurchase(3000000, {
      method: "finance",
      termMonths: 60,
      downPercent: 0,
      apr: 6,
    });
    expect(q.method).toBe("finance");
    if (q.method !== "finance") throw Error("Wrong estimate");
    expect(q.monthlyCents).toBe(57998);
    expect(q.totalCents).toBe(3479904);
    expect(q.monthlyCents * 59 + q.finalPaymentCents).toBe(q.totalCents);
    expect(q.interestCents).toBe(q.totalCents - 3000000);
  });
  it("handles zero interest and a down payment without NaN or charging interest", () => {
    const q = estimatePurchase(4000000, {
      method: "finance",
      termMonths: 60,
      downPercent: 25,
      apr: 0,
    });
    const nearZero = estimatePurchase(4000000, {
      method: "finance",
      termMonths: 60,
      downPercent: 25,
      apr: 1e-20,
    });
    expect(nearZero.method === "finance" && nearZero.monthlyCents).toBe(50000);
    expect(q).toMatchObject({
      method: "finance",
      downCents: 1000000,
      monthlyCents: 50000,
      principalCents: 3000000,
      interestCents: 0,
      totalCents: 4000000,
    });
  });
  it("counts the first lease installment once, with acquisition and return fees", () => {
    const q = estimatePurchase(5000000, {
      method: "lease",
      termMonths: 36,
      downPercent: 10,
      annualMiles: 10000,
    });
    if (q.method !== "lease") throw Error("Wrong estimate");
    expect(q.residualCents).toBe(3000000);
    expect(q.monthlyCents).toBe(60417); // ($45,000 - $30,000)/36 + ($45,000 + $30,000)*.0025
    expect(q.dueAtSigningCents).toBe(500000 + 79500 + 60417);
    expect(q.totalCents).toBe(500000 + 79500 + 60417 * 36 + 39500);
    expect(q.allowedMiles).toBe(30000);
  });
  it("adjusts lease residual and allowed mileage with term and mileage selection", () => {
    const low = estimatePurchase(5000000, {
      method: "lease",
      termMonths: 36,
      downPercent: 0,
      annualMiles: 10000,
    });
    const high = estimatePurchase(5000000, {
      method: "lease",
      termMonths: 36,
      downPercent: 0,
      annualMiles: 15000,
    });
    if (low.method !== "lease" || high.method !== "lease")
      throw Error("Wrong estimate");
    expect(high.residualPercent).toBe(55);
    expect(high.allowedMiles).toBe(45000);
    expect(high.monthlyCents).toBeGreaterThan(low.monthlyCents);
  });
  it("validates rates, terms, dollar inputs and rejects injected payment amounts", () => {
    expect(() => estimatePurchase(-1, { method: "cash" })).toThrow();
    expect(() => estimatePurchase(NaN, { method: "cash" })).toThrow();
    expect(() =>
      purchasePreferenceSchema.parse({
        method: "finance",
        termMonths: 60,
        downPercent: 10,
        apr: Infinity,
      }),
    ).toThrow();
    expect(() =>
      purchasePreferenceSchema.parse({
        method: "lease",
        termMonths: 84,
        downPercent: 0,
        annualMiles: 10000,
      }),
    ).toThrow();
    expect(() =>
      purchasePreferenceSchema.parse({ method: "cash", monthlyCents: 1 }),
    ).toThrow();
    expect(() =>
      purchaseSettingsSchema.parse({
        ...defaultPurchaseSettings,
        residual48: 74,
      }),
    ).toThrow();
  });
  it("preserves cash, finance and lease preferences in shared URLs without changing the vehicle price", () => {
    const base = defaultConfiguration(seedCatalog);
    const preferences = [
      { method: "cash" },
      { method: "finance", termMonths: 72, downPercent: 20, apr: 7 },
      { method: "lease", termMonths: 48, downPercent: 5, annualMiles: 12000 },
    ] as const;
    for (const purchasePreference of preferences) {
      const c = { ...base, purchasePreference };
      expect(
        configurationFromQuery(
          seedCatalog,
          new URLSearchParams(configurationQuery(c)),
        ),
      ).toEqual(c);
      expect(priceConfiguration(seedCatalog, c).totalCents).toBe(5299000);
    }
    const bad = new URLSearchParams(
      configurationQuery({ ...base, paint: "volt-blue" }),
    );
    bad.set("payment", "{broken");
    expect(configurationFromQuery(seedCatalog, bad).paint).toBe("volt-blue");
    expect(
      configurationFromQuery(seedCatalog, bad).purchasePreference,
    ).toBeUndefined();
    expect(
      configurationFromQuery(
        seedCatalog,
        new URLSearchParams(configurationQuery(base)),
      ),
    ).toEqual(base);
  });
  it("captures assumptions as scalar values that do not change when settings change", () => {
    const settings = { ...defaultPurchaseSettings };
    const before = estimatePurchase(
      5299000,
      { method: "lease", termMonths: 36, downPercent: 0, annualMiles: 10000 },
      settings,
    );
    settings.leaseMoneyFactor = 0.01;
    expect(before.method === "lease" && before.moneyFactor).toBe(0.0025);
  });
});
