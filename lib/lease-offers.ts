import { z } from "zod";
import { getDb } from "./db";
import {
  defaultPurchaseSettings,
  estimatePurchase,
  purchaseSettingsSchema,
  type PurchaseSettings,
} from "./purchase-planning";

export const leaseOfferInputSchema = z
  .object({
    termMonths: z.union([z.literal(24), z.literal(36), z.literal(48)]),
    downPercent: z.number().finite().min(0).max(20),
    annualMiles: z.union([
      z.literal(10000),
      z.literal(12000),
      z.literal(15000),
    ]),
  })
  .strict();

export type LeaseOfferInput = z.infer<typeof leaseOfferInputSchema>;

export type GeneratedLeaseOffer = {
  kind: "lease";
  version: 1;
  generatedAt: string;
  vehiclePriceCents: number;
  termMonths: 24 | 36 | 48;
  annualMiles: 10000 | 12000 | 15000;
  downPercent: number;
  downCents: number;
  monthlyCents: number;
  upfrontCents: number;
  dueAtSigningCents: number;
  residualCents: number;
  residualPercent: number;
  moneyFactor: number;
  acquisitionFeeCents: number;
  dispositionFeeCents: number;
  excessMileageCents: number;
  allowedMiles: number;
  totalCents: number;
};

export async function getLeasePurchaseSettings(): Promise<PurchaseSettings> {
  const row = await getDb().siteSetting.findUnique({
    where: { key: "purchase-planning" },
  });

  return purchaseSettingsSchema.parse(row?.value || defaultPurchaseSettings);
}

export function generateLeaseOffer(
  vehiclePriceCents: number,
  input: LeaseOfferInput,
  settings: PurchaseSettings,
): GeneratedLeaseOffer {
  const parsed = leaseOfferInputSchema.parse(input);
  const estimate = estimatePurchase(
    vehiclePriceCents,
    { method: "lease", ...parsed },
    settings,
  );

  if (estimate.method !== "lease") throw Error("Expected a lease estimate.");

  return {
    kind: "lease",
    version: 1,
    generatedAt: new Date().toISOString(),
    vehiclePriceCents,
    termMonths: parsed.termMonths,
    annualMiles: parsed.annualMiles,
    downPercent: parsed.downPercent,
    downCents: estimate.downCents,
    monthlyCents: estimate.monthlyCents,
    upfrontCents: estimate.downCents + estimate.acquisitionFeeCents,
    dueAtSigningCents: estimate.dueAtSigningCents,
    residualCents: estimate.residualCents,
    residualPercent: estimate.residualPercent,
    moneyFactor: estimate.moneyFactor,
    acquisitionFeeCents: estimate.acquisitionFeeCents,
    dispositionFeeCents: estimate.dispositionFeeCents,
    excessMileageCents: estimate.excessMileageCents,
    allowedMiles: estimate.allowedMiles,
    totalCents: estimate.totalCents,
  };
}

export function leaseOfferFromJson(value: unknown): GeneratedLeaseOffer | null {
  const parsed = z
    .object({
      kind: z.literal("lease"),
      version: z.literal(1),
      generatedAt: z.string(),
      vehiclePriceCents: z.number().int().positive(),
      termMonths: z.union([z.literal(24), z.literal(36), z.literal(48)]),
      annualMiles: z.union([
        z.literal(10000),
        z.literal(12000),
        z.literal(15000),
      ]),
      downPercent: z.number().finite().min(0).max(20),
      downCents: z.number().int().min(0),
      monthlyCents: z.number().int().positive(),
      upfrontCents: z.number().int().min(0),
      dueAtSigningCents: z.number().int().positive(),
      residualCents: z.number().int().min(0),
      residualPercent: z.number().finite().min(0).max(100),
      moneyFactor: z.number().finite().min(0),
      acquisitionFeeCents: z.number().int().min(0),
      dispositionFeeCents: z.number().int().min(0),
      excessMileageCents: z.number().int().min(0),
      allowedMiles: z.number().int().positive(),
      totalCents: z.number().int().positive(),
    })
    .safeParse(value);

  return parsed.success ? parsed.data : null;
}

export function addUtcMonths(epochSeconds: number, months: number) {
  const start = new Date(epochSeconds * 1000);
  const year = start.getUTCFullYear();
  const monthIndex = start.getUTCMonth() + months;
  const targetYear = year + Math.floor(monthIndex / 12);
  const targetMonth = ((monthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const day = Math.min(start.getUTCDate(), lastDay);

  return Math.floor(
    Date.UTC(
      targetYear,
      targetMonth,
      day,
      start.getUTCHours(),
      start.getUTCMinutes(),
      start.getUTCSeconds(),
    ) / 1000,
  );
}
