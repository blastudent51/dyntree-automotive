CREATE TABLE "VehicleSubscription" (
 "id" UUID NOT NULL, "userId" UUID NOT NULL, "reservationId" UUID NOT NULL,
 "stripePriceId" TEXT NOT NULL, "stripeCustomerId" TEXT, "stripeSubscriptionId" TEXT,
 "checkoutSessionId" TEXT, "checkoutAttempt" INTEGER NOT NULL DEFAULT 0,
 "status" TEXT NOT NULL DEFAULT 'INVITED', "monthlyCents" INTEGER NOT NULL,
 "currency" TEXT NOT NULL DEFAULT 'usd', "livemode" BOOLEAN NOT NULL,
 "termsVersion" TEXT NOT NULL, "termsSnapshot" JSONB NOT NULL,
 "agreementAcceptedAt" TIMESTAMP(3), "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
 "currentPeriodEnd" TIMESTAMP(3), "lastSyncedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "VehicleSubscription_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "VehicleSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "VehicleSubscription_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "VehicleSubscription_reservationId_key" ON "VehicleSubscription"("reservationId");
CREATE UNIQUE INDEX "VehicleSubscription_stripeCustomerId_key" ON "VehicleSubscription"("stripeCustomerId");
CREATE UNIQUE INDEX "VehicleSubscription_stripeSubscriptionId_key" ON "VehicleSubscription"("stripeSubscriptionId");
CREATE UNIQUE INDEX "VehicleSubscription_checkoutSessionId_key" ON "VehicleSubscription"("checkoutSessionId");
CREATE INDEX "VehicleSubscription_userId_createdAt_idx" ON "VehicleSubscription"("userId", "createdAt");
CREATE TABLE "SubscriptionInvoice" (
 "id" UUID NOT NULL, "vehicleSubscriptionId" UUID NOT NULL, "stripeInvoiceId" TEXT NOT NULL,
 "status" TEXT NOT NULL, "amountDueCents" INTEGER NOT NULL, "amountPaidCents" INTEGER NOT NULL,
 "currency" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "SubscriptionInvoice_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "SubscriptionInvoice_vehicleSubscriptionId_fkey" FOREIGN KEY ("vehicleSubscriptionId") REFERENCES "VehicleSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SubscriptionInvoice_stripeInvoiceId_key" ON "SubscriptionInvoice"("stripeInvoiceId");
CREATE FUNCTION protect_vehicle_subscription_terms() RETURNS trigger AS $$
BEGIN
 IF NEW."userId" IS DISTINCT FROM OLD."userId" OR NEW."reservationId" IS DISTINCT FROM OLD."reservationId" OR NEW."stripePriceId" IS DISTINCT FROM OLD."stripePriceId" OR NEW."monthlyCents" IS DISTINCT FROM OLD."monthlyCents" OR NEW."currency" IS DISTINCT FROM OLD."currency" OR NEW."livemode" IS DISTINCT FROM OLD."livemode" OR NEW."termsVersion" IS DISTINCT FROM OLD."termsVersion" OR NEW."termsSnapshot" IS DISTINCT FROM OLD."termsSnapshot" THEN
  RAISE EXCEPTION 'Subscription commercial terms are immutable';
 END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER protect_vehicle_subscription_terms BEFORE UPDATE ON "VehicleSubscription" FOR EACH ROW EXECUTE FUNCTION protect_vehicle_subscription_terms();
