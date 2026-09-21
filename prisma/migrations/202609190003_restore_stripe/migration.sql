-- Preserve all existing provider records, environments, and immutable snapshots.
ALTER TABLE "Reservation" ALTER COLUMN "paymentProvider" SET DEFAULT 'stripe';
ALTER TABLE "Reservation" ALTER COLUMN "paymentEnvironment" SET DEFAULT 'test';
