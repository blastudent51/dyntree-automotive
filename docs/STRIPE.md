# Stripe setup and return from Airwallex

Dyntree again uses Stripe Checkout for reservation deposits, signed Stripe webhooks and administrator refunds. The vehicle design, images, configurator and customer portal are unchanged.

In Vercel, set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`, plus the existing database, Clerk and application URL variables. Start with a Stripe test key. Register `https://YOUR-DOMAIN/api/stripe/webhook` for `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed` and `charge.refunded`. Only verified successful payment events allocate reservation numbers. Set `ENABLE_LIVE_PAYMENTS=true` explicitly before using live keys. See SETUP.md for complete deployment instructions.

Apply `npm run db:migrate` before deploying. All previous migrations remain included. The new `202609190003_restore_stripe` migration changes defaults for new reservations to Stripe; it does not rewrite existing provider IDs, payments, reservation numbers, snapshots or agreed prices. Identifier columns remain provider-neutral for compatibility.

Remove Airwallex environment variables from the new deployment. Any actual Airwallex payments must still be serviced and refunded through Airwallex. Finish pending payments with their original integration before switching traffic. The app rejects cross-provider refunds rather than sending historical charges to Stripe. No live payment credentials or real provider transactions were used in automated verification.

Official references: [Stripe Checkout](https://docs.stripe.com/checkout/quickstart), [Stripe webhooks](https://docs.stripe.com/webhooks).

## Checkout database compatibility repair — 2026-09-20

`202609200001_stripe_compatibility` restores the original Stripe field names as synchronized aliases. Both the original Stripe client and the current provider-neutral client can access the same identifiers. Keep all migration files when updating your repository; do not reset production or use `db push` to remove aliases. The migration has already been applied to the connected production branch; normal `npm run db:migrate` will recognize its recorded checksum.

Redeploy this updated source to also enable safe Prisma-code logging and stable Checkout retry parameters. The database compatibility repair itself is already active and does not require redeployment. Clerk telemetry notices are informational and do not explain Prisma query failures.

## Monthly vehicle subscriptions

Recurring billing is now supported separately from reservation payments. Read [SUBSCRIPTIONS.md](SUBSCRIPTIONS.md) before enabling it. Configure the dedicated billing portal and additional webhook events; create actual monthly Stripe Prices and ready-vehicle invitations in Admin. No reservation automatically becomes a subscription.
