# Monthly vehicle subscriptions through Stripe

Dyntree uses Stripe Billing subscriptions for recurring vehicle payments. This replaces the public finance/lease estimator flow; `/financing` redirects to `/subscriptions`. No loan origination, APR, interest calculation or ownership payoff is part of this new checkout. Previously saved estimate records remain available as historical data.

The billing API does not define the underlying vehicle-use contract. Publish terms covering what the monthly service supplies, vehicle availability, mileage, insurance, maintenance, damage, taxes, cancellation and return obligations before invitations are enabled. The app does not invent those business terms or monthly rates.

## What is implemented

- Admin creates a subscription invitation tied to one paid reservation and one actual Stripe monthly Price.
- Invitations are limited to reservations at Ready to ship, Shipped or Delivered. Prototype reservations are not charged a monthly amount automatically.
- Customer reviews the monthly price and a frozen copy of the terms in My Dyntree → Subscriptions, then explicitly accepts recurring charges.
- Stripe-hosted Checkout uses `mode: subscription`, quantity 1 and the server-selected Price ID. The first monthly payment is collected at checkout, followed by monthly renewals until cancellation. No automatic trial, installment payoff, APR or transfer of ownership is promised.
- Existing $250/default reservation deposits remain separate, are not treated as down payments and are not automatically credited against a subscription.
- Customer portal manages payment methods, invoice history and cancellation at the end of the current billing period. Plan changes are disabled so the invitation's agreed price cannot silently change.
- Signed webhooks reconcile actual Stripe subscription/invoice state. Success-page redirects never grant paid status. Failed payments, renewals, authentication-required invoices, scheduled cancellation and final cancellation are reflected in the account.
- Database uniqueness and Stripe idempotency prevent duplicate subscriptions for an invitation. Expired Checkout sessions can be replaced. Commercial terms are immutable through a database trigger. Audit logs record invitations and settings changes.

## Required Stripe setup

Use an isolated preview and Stripe test mode first. This workspace did not have your Stripe or Vercel credentials; actual Stripe-hosted Checkout and portal access must still be verified with those credentials.

1. In Stripe, create a product for the monthly vehicle service. Create an active **USD recurring monthly flat-rate Price**, billed every one month, with explicit inclusive or exclusive tax behavior. Do not use metered, annual, tiered, free or transformed-quantity prices. Copy its `price_…` ID. Pricing is per configuration invitation; do not reuse a generic price for extra options unless your business intends to include them.
2. Configure a dedicated Stripe customer portal configuration. Enable **payment method updates**, **invoice history**, and **subscription cancellation at the end of the billing period**. Disable subscription plan changes. Copy its `bpc_…` configuration ID.
3. Add `STRIPE_BILLING_PORTAL_CONFIGURATION_ID=bpc_…` in Vercel for the matching test/live environment.
4. Keep the existing `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` and correct `NEXT_PUBLIC_APP_URL` (for example `https://www.dyntree.us`). Keep `ENABLE_LIVE_PAYMENTS=true` for a live Stripe key. The new `ENABLE_VEHICLE_SUBSCRIPTIONS=true` flag is additionally required before inviting or starting **live** subscriptions. It ships false. Test subscriptions still require explicit admin settings and an eligible test reservation.
5. Extend the existing webhook endpoint `/api/stripe/webhook` to receive:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `customer.subscription.paused`
   - `customer.subscription.resumed`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `invoice.payment_action_required`
   - `invoice.updated`
   Keep the existing reservation events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`.
6. Configure Stripe's customer billing emails and payment retries to match your policy. If using automatic tax, configure Stripe Tax first; the admin setting is stored in each invitation. No jurisdiction-specific tax rules are guessed by this app.

## Deployment and database

Deploy this updated source to the existing Vercel repository. No migration files from earlier releases should be removed. `202609200002_vehicle_subscriptions` adds `VehicleSubscription` and `SubscriptionInvoice`, their indexes and an immutability trigger. The tested migration has already been applied to the connected production branch. For other databases, apply `npm run db:migrate` before deploying a server that accesses these tables; the recorded migration checksum makes normal deploys skip the already-applied migration. No existing reservation/payment rows are rewritten by the new migration.

In Admin → Site content & settings, click **Set up monthly subscriptions**, enter and version your real vehicle-use terms, choose the tax setting, then enable invitation checkout. The optional seed also inserts the disabled settings row without overwriting existing settings.

In Admin → Monthly subscriptions, enter an eligible reservation number and the actual Stripe monthly Price ID. Confirm that the vehicle is available and that the price/terms cover its exact configuration. Creating the invitation does not charge the customer or send email. The invitation appears in the customer's Subscriptions tab.

## Operating behavior

- Disabling the site setting or the live subscription flag pauses new signup; keep your Stripe credentials and general live-payments setting intact so webhook reconciliation and existing customers' billing management continue.
- Cancellation schedules the end of renewal; vehicle return obligations are still determined by the accepted terms.
- Cancelling/refunding a reservation does not automatically refund or cancel a separate monthly subscription. Administer an existing subscription and any subscription refunds in Stripe. The reservation refund screen only refunds reservation deposits.
- This release supports one subscription contract per reservation. Do not manually change its price or metadata in Stripe; the reconciler rejects mismatches. It does not implement contract restarts, swaps, proration, usage billing, payment plans or final vehicle purchase.
- The portal customer is isolated to this contract. Ownership is checked server-side for all customer endpoints. Payment details remain with Stripe.
- New signup validates the current Stripe Price and portal capabilities before checkout; changing portal configuration to remove required cancellation/payment management prevents new checkouts.

## Verification and remaining activation

Unit tests validate recurring Price restrictions, terms gates and live/test isolation. Database integration tests use a separate branch with mocked Stripe transport and cover ownership, checkout retries, consent, tamper rejection, paid/failed invoices, duplicate/out-of-order webhook events, cancellation, immutable terms, portal access and preservation of reservation deposits. No live charges, actual Stripe subscription, actual customer portal session or credit request was created during development.

Before launch, perform a real **Stripe test-mode** checkout, renew a test subscription with a test clock, exercise a failed payment, cancel through the portal and verify signed webhook delivery. Real vehicle availability and operational terms must be supplied by Dyntree; production status must not be changed merely to bypass the ready-vehicle check.

References: [Stripe subscription webhooks](https://docs.stripe.com/billing/subscriptions/webhooks), [Stripe hosted subscriptions](https://docs.stripe.com/billing/subscriptions/build-subscriptions), [Stripe customer portal](https://docs.stripe.com/customer-management/integrate-customer-portal).
