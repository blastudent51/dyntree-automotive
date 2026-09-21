-- Additive compatibility for already-deployed Stripe Prisma clients.
-- Preserve canonical identifiers and immutable reservation snapshots.
ALTER TABLE "Reservation" ADD COLUMN "checkoutSessionId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "stripePaymentIntentId" TEXT;
ALTER TABLE "Refund" ADD COLUMN "stripeRefundId" TEXT;
ALTER TABLE "WebhookEvent" ADD COLUMN "stripeEventId" TEXT;

UPDATE "Reservation" SET "checkoutSessionId" = "legacyCheckoutSessionId";
UPDATE "Payment" SET "stripePaymentIntentId" = "providerPaymentIntentId";
UPDATE "Refund" SET "stripeRefundId" = "providerRefundId";
UPDATE "WebhookEvent" SET "stripeEventId" = "providerEventId";

CREATE UNIQUE INDEX "Reservation_checkoutSessionId_key" ON "Reservation"("checkoutSessionId");
CREATE UNIQUE INDEX "Payment_stripePaymentIntentId_key" ON "Payment"("stripePaymentIntentId");
CREATE UNIQUE INDEX "Refund_stripeRefundId_key" ON "Refund"("stripeRefundId");
CREATE UNIQUE INDEX "WebhookEvent_stripeEventId_key" ON "WebhookEvent"("stripeEventId");

CREATE FUNCTION sync_payment_identifier_aliases() RETURNS trigger AS $$
DECLARE
  row_new jsonb := to_jsonb(NEW);
  row_old jsonb;
  alias_value text := row_new ->> TG_ARGV[0];
  canonical_value text := row_new ->> TG_ARGV[1];
  alias_changed boolean := false;
  canonical_changed boolean := false;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    row_old := to_jsonb(OLD);
    alias_changed := alias_value IS DISTINCT FROM (row_old ->> TG_ARGV[0]);
    canonical_changed := canonical_value IS DISTINCT FROM (row_old ->> TG_ARGV[1]);
    IF alias_changed AND NOT canonical_changed THEN
      canonical_value := alias_value;
    ELSIF canonical_changed AND NOT alias_changed THEN
      alias_value := canonical_value;
    END IF;
  ELSE
    alias_value := COALESCE(alias_value, canonical_value);
    canonical_value := COALESCE(canonical_value, alias_value);
  END IF;
  IF alias_value IS DISTINCT FROM canonical_value THEN
    RAISE EXCEPTION 'Conflicting payment identifier aliases' USING ERRCODE = '23514';
  END IF;
  NEW := jsonb_populate_record(NEW, jsonb_build_object(TG_ARGV[0], alias_value, TG_ARGV[1], canonical_value));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_reservation_session BEFORE INSERT OR UPDATE ON "Reservation"
FOR EACH ROW EXECUTE FUNCTION sync_payment_identifier_aliases('checkoutSessionId', 'legacyCheckoutSessionId');
CREATE TRIGGER sync_payment_intent BEFORE INSERT OR UPDATE ON "Payment"
FOR EACH ROW EXECUTE FUNCTION sync_payment_identifier_aliases('stripePaymentIntentId', 'providerPaymentIntentId');
CREATE TRIGGER sync_refund_identifier BEFORE INSERT OR UPDATE ON "Refund"
FOR EACH ROW EXECUTE FUNCTION sync_payment_identifier_aliases('stripeRefundId', 'providerRefundId');
CREATE TRIGGER sync_webhook_identifier BEFORE INSERT OR UPDATE ON "WebhookEvent"
FOR EACH ROW EXECUTE FUNCTION sync_payment_identifier_aliases('stripeEventId', 'providerEventId');
