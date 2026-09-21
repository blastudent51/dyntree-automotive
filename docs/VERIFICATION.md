# Verification

This report distinguishes tested code/database behavior from external provider and browser checks that still require a deployment.

## Recorded result — Stripe vehicle subscriptions, 2026-09-20

| Gate | Result |
| --- | --- |
| ESLint | Passed |
| Strict TypeScript | Passed |
| Unit tests | 29 passed |
| PostgreSQL and authenticated API integration tests | 6 passed |
| Asset coverage | 44 local assets verified |
| Native Next.js production build | Passed, 34 application routes |
| Browser visual QA | Blocked by preview runtime |
| Live provider integration | Requires credentials |

## Automated commands

```sh
npm run lint
npm run typecheck
npm test
npm run check:assets
npm run test:db
npm run build
```

Database tests are explicitly opt-in and require a seeded **disposable development database** and generated session secret. They create synthetic reservations/payments and immutable snapshots. Do not point them at production or a real customer database.

Coverage includes:

- Four-trim base prices, option additions, no duplicate charge for included equipment, compatibility/duplicate/tampered input rejection, URL round trips and admin pricing/default changes.
- Asset selection for all paints, trims, wheels and interiors, inactive-asset exclusion and approximate-render disclosure.
- Safe redirects, escaped email text and production rejection of development mechanisms.
- Concurrent payment confirmations produce one number/payment/history/email; wrong amounts fail and PostgreSQL rejects snapshot mutation.
- Duplicate webhook deduplication, admin refund reconciliation and full-refund preservation after an older partial event.
- Authenticated route behavior against PostgreSQL: anonymous rejection, customer/admin isolation, configuration ownership, simulated reservation/retry, snapshot, forward/backward status rules, refund, audit and account data.
- Rejection of Stripe requests without valid signatures.

Native production verification uses Next.js compilation and strict TypeScript. Prisma Client comes from the committed schema. Asset checks verify 44 local images/screens and required coverage.

## Observed limits

- Managed browser preview initially hit a Clerk matcher incompatibility, which was fixed. The one allowed retry encountered `ReferenceError: require is not defined` in its compatibility runtime. Native Next.js production builds passed separately. No desktop/mobile screenshots, interactive browser test or measured accessibility/performance audit was completed.
- The owner deployed the site on Vercel at https://dyntree-automotive.vercel.app. This repair applied the database migration directly; bundled code changes require a new Vercel deployment.
- The sandbox could not run Prisma migration engine's direct TCP connection. The exact versioned SQL was applied transactionally through Neon and recorded with its checksum in `_prisma_migrations`. Prisma/Neon WebSocket runtime queries and transactions passed. Standard deployments should use `npm run db:migrate` with the direct URL.
- Clerk, Stripe and Resend credentials were unavailable. Tests exercised explicit local simulation and signature rejection, not an actual Stripe payment, actual Clerk sign-up or real email delivery.

## Deployment smoke test

1. Inspect desktop, tablet and 390px mobile: hero, imagery, sticky controls, menus, footer, legal text, forms and admin dialogs.
2. Navigate with keyboard; check focus, labels, menu/dialog dismissal, gallery arrows, screen-reader landmarks and reduced motion.
3. Configure every trim and paint/wheel/interior; verify packages/pricing, fallback notices, fullscreen gestures, URL sharing and saved configurations.
4. Create/verify a real Clerk account. Confirm ownership isolation and rejection of non-admin API access.
5. Complete Stripe test checkout, verify the signed webhook, reservation number and snapshot, then redeliver it. Reject invalid signatures/mismatched amounts.
6. Issue partial/full test refunds and verify audit, reconciliation, status and a single email. Retry the operation key.
7. Verify Resend with the actual sender and authenticated cron; failed sends must remain queued.
8. Edit catalog, imagery, announcements and reservation terms; confirm the current site updates without changing old snapshots.
9. Confirm production mode disables development authentication/payment simulation and all variables point to the correct branch/domain.

Real vehicle engineering, approvals, hardware phone key, ADAS, charging-network access, OTA infrastructure and operational LIVI integration remain vehicle-development work. Public copy identifies them as concepts or targets.

## Stripe schema compatibility repair

The original Stripe Prisma client reproduced `P2022` (`Reservation.checkoutSessionId` missing) against an isolated clone of production. After the additive migration, original and current generated Prisma clients successfully created/read reservation, payment, refund and webhook records. Checkout session identifiers synchronized in both directions, including clearing values; duplicate payment identifiers and conflicting aliases were rejected. Historical reservation pricing remained immutable.

The exact tested migration and checksum were applied transactionally to production. Post-migration checks found no identifier mismatches and no reservation/payment/refund records had been added by the repair. No Stripe API request or charge was made. This reproduces a database incompatibility affecting the original client; the deployed checkout request must still be retried to verify its full path.

The code now logs Prisma error codes without raw queries or customer data. Checkout uses Stripe's default session expiration instead of a changing timestamp, keeping retries stable and avoiding the minimum-expiry boundary. These code changes take effect after redeployment.

## Financing and lease planning update

Added server-validated ownership preferences, shared URL state, cash/finance/lease estimators, account displays, immutable server-calculated reservation estimates and audited administrator assumption settings. Seven new unit tests cover formulas, zero interest, rounding, mileage, parameter validation, historical assumptions and URL persistence. Five database/API integration tests passed against the isolated `dev-finance-lease-planning` branch, including a lease preference through save, simulated checkout and retry with an unchanged $250 deposit. No production customer data was mutated by these tests.

The integration test exposed JSON key ordering affecting checkout retries; the comparison now checks structural equality instead of hashing JSON serialization order. No real Stripe charges, credit checks or lender applications were made. No lender/lessor is connected. Desktop/mobile browser verification was attempted but Chromium installation failed with an upstream HTTP 502. Responsive CSS is implemented; screenshot-based visual verification is still pending.

Native production server smoke checks returned HTTP 200 with the expected rendered content for `/financing` and `/configure/m1e`. These response checks do not replace interactive browser or visual QA.

## Stripe vehicle subscriptions

29 unit tests and 6 database/API integration tests passed. The subscription lifecycle test used the isolated `dev-stripe-vehicle-subscriptions` branch with mocked Stripe transport; it verified explicit consent, price tampering rejection, ownership isolation, stable checkout retries, distinct invoice records, duplicate-event handling, latest-state reconciliation after out-of-order events, failed payments, scheduled/final cancellation, immutable commercial terms and portal access with signup disabled. The $250 reservation amount and reservation payment ledger were unchanged by monthly billing events.

The additive subscription migration was tested on that branch and then applied transactionally with its checksum to production. No live subscription or subscription invoice was created. New monthly checkout is disabled until admin terms/settings, real ready-vehicle invitations and matching Stripe configuration are provided.

Lint, strict type checking and the native Next.js production build passed. Native server smoke checks passed for `/subscriptions`, `/configure/m1e`, and the `/financing` redirect. Browser screenshots remain unverified because this environment could not install Chromium. Real Stripe Checkout, portal sessions and signed provider delivery require the owner's Stripe test credentials and deployed environment; no actual Stripe API call was made by the mocked lifecycle test.
