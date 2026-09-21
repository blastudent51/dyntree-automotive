-- Keep the Prisma schema aligned with manually-created complimentary/unclaimed reservations.
ALTER TABLE "Reservation" ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "Reservation"
  ADD COLUMN IF NOT EXISTS "reservedForName" TEXT,
  ADD COLUMN IF NOT EXISTS "reservedForEmail" TEXT,
  ADD COLUMN IF NOT EXISTS "reservedForPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "claimCode" TEXT,
  ADD COLUMN IF NOT EXISTS "amountDue" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "amountPaid" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "complimentary" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "manualNote" TEXT,
  ADD COLUMN IF NOT EXISTS "claimedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "createdByAdminId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Reservation_claimCode_key"
  ON "Reservation"("claimCode")
  WHERE "claimCode" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "Reservation_reservedForName_idx"
  ON "Reservation"("reservedForName");
CREATE INDEX IF NOT EXISTS "Reservation_paymentStatus_idx"
  ON "Reservation"("paymentStatus");
CREATE INDEX IF NOT EXISTS "Reservation_complimentary_idx"
  ON "Reservation"("complimentary");
