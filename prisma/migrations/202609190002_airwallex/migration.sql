-- Preserve historical identifiers and immutable reservation snapshots.
ALTER TABLE "Reservation" RENAME COLUMN "checkoutSessionId" TO "legacyCheckoutSessionId";
ALTER INDEX "Reservation_checkoutSessionId_key" RENAME TO "Reservation_legacyCheckoutSessionId_key";
ALTER TABLE "Reservation" ADD COLUMN "paymentProvider" TEXT NOT NULL DEFAULT 'stripe';
UPDATE "Reservation" SET "paymentProvider" = 'simulation' WHERE "simulated" = true;
ALTER TABLE "Reservation" ALTER COLUMN "paymentProvider" SET DEFAULT 'airwallex';
ALTER TABLE "Reservation" ADD COLUMN "paymentEnvironment" TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE "Reservation" ALTER COLUMN "paymentEnvironment" SET DEFAULT 'demo';
ALTER TABLE "Payment" RENAME COLUMN "stripePaymentIntentId" TO "providerPaymentIntentId";
ALTER INDEX "Payment_stripePaymentIntentId_key" RENAME TO "Payment_providerPaymentIntentId_key";
ALTER TABLE "Refund" RENAME COLUMN "stripeRefundId" TO "providerRefundId";
ALTER INDEX "Refund_stripeRefundId_key" RENAME TO "Refund_providerRefundId_key";
ALTER TABLE "Refund" ADD COLUMN "providerUpdatedAt" TIMESTAMP(3);
ALTER TABLE "WebhookEvent" RENAME COLUMN "stripeEventId" TO "providerEventId";
ALTER INDEX "WebhookEvent_stripeEventId_key" RENAME TO "WebhookEvent_providerEventId_key";
UPDATE "WebhookEvent" SET "providerEventId" = 'stripe:' || "providerEventId";
