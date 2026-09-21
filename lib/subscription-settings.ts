import { z } from "zod";
export const subscriptionSettingsSchema = z
  .object({
    enabled: z.boolean(),
    termsVersion: z.string().min(1).max(60),
    terms: z.string().max(12000),
    automaticTax: z.boolean(),
  })
  .strict()
  .refine(
    (v) => !v.enabled || v.terms.trim().length >= 100,
    "Publish subscription terms before enabling invitations.",
  );
export const defaultSubscriptionSettings = {
  enabled: false,
  termsVersion: "subscription-v1",
  terms: "",
  automaticTax: false,
};
export type SubscriptionSettings = z.infer<typeof subscriptionSettingsSchema>;
