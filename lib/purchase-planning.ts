import { z } from "zod";

export const purchasePreferenceSchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("cash") }).strict(),
  z
    .object({
      method: z.literal("finance"),
      termMonths: z.union([
        z.literal(36),
        z.literal(48),
        z.literal(60),
        z.literal(72),
        z.literal(84),
      ]),
      downPercent: z.number().finite().min(0).max(50),
      apr: z.number().finite().min(0).max(30),
    })
    .strict(),
  z
    .object({
      method: z.literal("lease"),
      termMonths: z.union([z.literal(24), z.literal(36), z.literal(48)]),
      downPercent: z.number().finite().min(0).max(20),
      annualMiles: z.union([
        z.literal(10000),
        z.literal(12000),
        z.literal(15000),
      ]),
    })
    .strict(),
]);
export type PurchasePreference = z.infer<typeof purchasePreferenceSchema>;
export const purchaseSettingsSchema = z
  .object({
    financeApr: z.number().finite().min(0).max(30),
    leaseMoneyFactor: z.number().finite().min(0).max(0.02),
    residual24: z.number().finite().min(25).max(75),
    residual36: z.number().finite().min(25).max(75),
    residual48: z.number().finite().min(25).max(75),
    mileage12000Reduction: z.number().finite().min(0).max(10),
    mileage15000Reduction: z.number().finite().min(0).max(15),
    acquisitionFeeCents: z.number().int().min(0).max(500000),
    dispositionFeeCents: z.number().int().min(0).max(500000),
    excessMileageCents: z.number().int().min(0).max(200),
  })
  .strict()
  .refine(
    (s) =>
      s.residual24 >= s.residual36 &&
      s.residual36 >= s.residual48 &&
      s.mileage15000Reduction >= s.mileage12000Reduction,
    "Residual assumptions must decrease with longer terms and higher mileage.",
  );
export type PurchaseSettings = z.infer<typeof purchaseSettingsSchema>;
// Illustrative assumptions, not lender rates, approvals, or advertised offers.
export const defaultPurchaseSettings: PurchaseSettings = {
  financeApr: 6.99,
  leaseMoneyFactor: 0.0025,
  residual24: 66,
  residual36: 60,
  residual48: 52,
  mileage12000Reduction: 2,
  mileage15000Reduction: 5,
  acquisitionFeeCents: 79500,
  dispositionFeeCents: 39500,
  excessMileageCents: 25,
};
export const purchaseDisclosure =
  "Planning estimate only. Financing and leasing are not currently available to apply for. No lender or lessor offer, credit decision, rate lock or guaranteed residual value. Availability and final terms depend on future partners, credit approval, location and production. Taxes, title, registration, destination, insurance and other applicable fees are excluded. The reservation deposit is separate and is not deducted from these estimates.";
export const preciseMoney = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
export function defaultPurchasePreference(
  method: PurchasePreference["method"],
  settings = defaultPurchaseSettings,
): PurchasePreference {
  if (method === "finance")
    return {
      method,
      termMonths: 60,
      downPercent: 10,
      apr: settings.financeApr,
    };
  if (method === "lease")
    return { method, termMonths: 36, downPercent: 0, annualMiles: 10000 };
  return { method };
}
export function estimatePurchase(
  priceCents: number,
  input: PurchasePreference,
  assumptions = defaultPurchaseSettings,
) {
  if (
    !Number.isSafeInteger(priceCents) ||
    priceCents <= 0 ||
    priceCents > 100000000
  )
    throw Error("Vehicle price is outside the estimator range.");
  const preference = purchasePreferenceSchema.parse(input);
  const settings = purchaseSettingsSchema.parse(assumptions);
  const common = {
    version: 1,
    illustrative: true,
    priceCents,
    preference,
    disclosure: purchaseDisclosure,
  };
  if (preference.method === "cash")
    return { ...common, method: "cash" as const, totalCents: priceCents };
  const downCents = Math.round((priceCents * preference.downPercent) / 100);
  if (preference.method === "finance") {
    const principalCents = priceCents - downCents;
    const rate = preference.apr / 1200;
    const payment =
      rate === 0
        ? principalCents / preference.termMonths
        : (principalCents * rate) /
          -Math.expm1(-preference.termMonths * Math.log1p(rate));
    // Adjust the final installment for penny rounding so totals reconcile.
    const monthlyCents = Math.round(payment);
    const paymentsCents = Math.round(payment * preference.termMonths);
    return {
      ...common,
      method: "finance" as const,
      downCents,
      principalCents,
      monthlyCents,
      finalPaymentCents:
        paymentsCents - monthlyCents * (preference.termMonths - 1),
      interestCents: paymentsCents - principalCents,
      totalCents: downCents + paymentsCents,
    };
  }
  const residuals = {
    24: settings.residual24,
    36: settings.residual36,
    48: settings.residual48,
  };
  const reduction =
    preference.annualMiles === 15000
      ? settings.mileage15000Reduction
      : preference.annualMiles === 12000
        ? settings.mileage12000Reduction
        : 0;
  const residualPercent = residuals[preference.termMonths] - reduction;
  const residualCents = Math.round((priceCents * residualPercent) / 100);
  const adjustedCapitalizedCents = priceCents - downCents;
  const depreciation =
    (adjustedCapitalizedCents - residualCents) / preference.termMonths;
  const rent =
    (adjustedCapitalizedCents + residualCents) * settings.leaseMoneyFactor;
  const monthlyCents = Math.round(depreciation + rent);
  const dueAtSigningCents =
    downCents + settings.acquisitionFeeCents + monthlyCents;
  return {
    ...common,
    method: "lease" as const,
    downCents,
    monthlyCents,
    residualCents,
    residualPercent,
    adjustedCapitalizedCents,
    moneyFactor: settings.leaseMoneyFactor,
    acquisitionFeeCents: settings.acquisitionFeeCents,
    dispositionFeeCents: settings.dispositionFeeCents,
    excessMileageCents: settings.excessMileageCents,
    allowedMiles: (preference.annualMiles * preference.termMonths) / 12,
    dueAtSigningCents,
    totalCents:
      dueAtSigningCents +
      monthlyCents * (preference.termMonths - 1) +
      settings.dispositionFeeCents,
  };
}
export type PurchaseEstimate = ReturnType<typeof estimatePurchase>;
export function purchasePreferenceLabel(preference?: PurchasePreference) {
  if (!preference) return "Purchase preference not selected";
  if (preference.method === "cash") return "Cash purchase preference";
  return preference.method === "finance"
    ? `Finance preference · ${preference.termMonths} months · ${preference.apr}% assumed APR`
    : `Lease preference · ${preference.termMonths} months · ${preference.annualMiles.toLocaleString("en-US")} miles/year`;
}
