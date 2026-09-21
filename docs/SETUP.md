# Setup and deployment

## Runtime and PostgreSQL

Use Node.js 22.13+ and npm. The committed `package-lock.json` is authoritative. Install with `npm install`; postinstall generates Prisma Client.

Create a Neon project with separate development and production branches. Obtain pooled and direct connection strings from the Neon console. Runtime queries use Prisma's Neon WebSocket adapter; migrations use the direct URL. A generic local PostgreSQL instance would require a corresponding Prisma driver adapter change.

Copy `.env.example` to `.env.local`, insert development connection strings and generate `DEV_SESSION_SECRET`. Never commit the environment file.

```sh
npm run db:migrate
npm run db:seed
npm run dev
```

The migration includes a PostgreSQL trigger preventing updates or deletion of reservation snapshots. Do not substitute `prisma db push`, which bypasses this trigger. The idempotent seed preserves existing admin edits. The prepared development branch already has the migration applied; see `ENVIRONMENT.md` for nonsecret identifiers. Downloaded copies need credentials from the account owner.

## Local identities and payment simulation

With `DEV_AUTH_ENABLED=true`, `NODE_ENV=development`, a random session secret of at least 32 characters and Clerk absent, the account page offers two explicitly labeled identities:

| Identity             | Role          |
| -------------------- | ------------- |
| customer@example.com | Customer      |
| admin@example.com    | Administrator |

Seed creates these only outside production when explicitly enabled. There are no passwords. Sessions use signed HTTP-only SameSite cookies with a four-hour expiration. Use `npm run dev`; `npm start` is production mode and rejects this mechanism.

With `DEV_PAYMENT_SIMULATION=true`, development mode and no Stripe key, checkout displays **Development payment simulation** and marks the record `simulated=true`. No card data is requested and no funds move. Adding a Stripe key selects Stripe test checkout. Missing production payment credentials never silently enable simulation.

## Clerk authentication

Create a Clerk development application, enable email sign-up/sign-in and require email verification. Set its publishable/secret keys and `DEV_AUTH_ENABLED=false`. The site uses Clerk's sign-in modal and requires a verified primary email. Roles come from PostgreSQL, not client claims or unverified metadata. Email collisions do not automatically link identities.

Sign in as the intended administrator so the app user exists, then run:

```sh
npm run admin:bootstrap -- user_YOUR_EXISTING_CLERK_ID
```

This grants an audited role. Further role changes can be made in `/admin`; administrators cannot demote themselves. Production requires a Clerk production instance and actual domain configuration.

## Stripe test payments

Set a Stripe **test** secret key and webhook signing secret. Forward events locally with Stripe CLI:

```sh
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Use the signing secret printed for that listener. Deployed endpoints subscribe to:

- `checkout.session.completed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`

Checkout recomputes configuration prices and the deposit on the server. It stores the agreed terms and configuration snapshot before creating Checkout. Card data stays with Stripe. Only a verified payment event allocates the reservation number; the browser success URL is not proof of payment.

Complete a reservation using Stripe's documented test payment methods. Verify account status, payment, snapshot, history and outbox, then redeliver the event. Test partial/full refunds in admin. Refunds require a reason and typing `REFUND`. Admin money fields use integer US cents.

`ENABLE_LIVE_PAYMENTS=true` is required in addition to a live key. Enable it only after the actual payment account, terms, support, domain and live webhooks are configured. The website does not charge the final vehicle price, taxes, destination or delivery fees.

## Email

Omit `RESEND_API_KEY` locally to log rendered HTML/text. Preview files are in `docs/email-previews/`; regenerate with `npm run email:previews`.

For delivery, set `RESEND_API_KEY` and `EMAIL_FROM` using a verified sender domain. Provider selection currently uses the presence of the Resend key; `EMAIL_PROVIDER` is informational. The persistent outbox is dispatched with Next.js `after()`; `/api/jobs/email` retries pending entries. Production without email credentials leaves entries queued.

Set a random `CRON_SECRET`. The included Vercel cron retries at 09:00 UTC daily, in addition to immediate request-triggered delivery. For higher volume, increase the scheduled cadence on a suitable plan. Each invocation handles 20 messages with fewer than five attempts. Inspect the outbox in admin; investigate exhausted attempts before an operational database retry.

## Vercel

1. Add this source to your Git repository, preserving the package-lock.json and excluding `.env.local`, dependencies, build outputs and local tool state.
2. Import into Vercel as Next.js using Node.js 22 or later. `vercel.json` supplies install/build commands and email cron.
3. Configure production database URLs, the actual HTTPS `NEXT_PUBLIC_APP_URL`, Clerk production keys, Stripe key/webhook secret, Resend key/sender and `CRON_SECRET`.
4. Set `DEV_AUTH_ENABLED=false` and `DEV_PAYMENT_SIMULATION=false`. Do not install a development session secret in production. Keep live payments off until the business is ready.
5. From a trusted shell with production variables, apply and seed the production database. The prepared production branch is currently empty:

```sh
NODE_ENV=production npm run db:migrate
NODE_ENV=production npm run db:seed
npm run build
```

6. Deploy, sign in with the intended production administrator, then run bootstrap against the production database using that existing Clerk ID.
7. Register the deployed `/api/stripe/webhook` URL in Stripe and use its own signing secret. Configure Clerk for the real domain.
8. Complete the checks in `VERIFICATION.md` before opening reservations. Set reservation availability in admin to match launch readiness.

Build does not automatically migrate the database, preventing preview deployments from modifying production accidentally. Separate preview databases and provider credentials. The browser origin must match `NEXT_PUBLIC_APP_URL` because authenticated writes enforce same-origin checks.

## Images and content

Artwork is optimized WebP in `public/`. For an image CDN, configure the exact HTTPS `IMAGE_CDN_HOST` and rebuild. Admin then accepts that host or local paths; arbitrary remote hosts are rejected.

Admin can manage catalog prices, compatibility, included equipment, trim targets, comparison specifications, image metadata, users, reservations, status, refunds and dealers. Deactivate obsolete entries rather than deleting historical context. Keep a compatible paint, wheel and interior for each active trim.

The `reservation` setting controls deposit, refundable status, availability, production window, language and agreement version. `announcements` is an array of `{ "title": "...", "body": "..." }`. The `company` setting accepts `{ "title": "...", "body": "..." }` to override the company introduction. Vehicle `specs` JSON keys are listed in `ARCHITECTURE.md`. Old reservation snapshots remain unchanged after edits.

Create dealers only for real locations. Before public operation, provide the actual legal entity, customer support contact, privacy operations, jurisdiction-specific reservation terms and any real warranty policy. The included pages avoid inventing these facts.

## Dealer network and pickup

The dealer network is database-driven. `/dealers` displays only dealer records with `active=true`; the page shows only the capabilities enabled on each record. Reservation checkout offers **Dealer Pickup** only when at least one dealer has both `active=true` and `pickup=true`.

Create and manage locations in **Administration → Dealers**. Use a stable lowercase dealer code (for example `tallahassee-west`), enter the real public-facing address/contact details, then enable only the capabilities that are actually available: showroom, service, pickup and/or delivery. Turning `active` off removes a location from the public dealer directory and from new pickup selection without deleting historical reservation links.

Administrators can also edit a paid reservation and switch its delivery method between `HOME_DELIVERY` and `DEALER_PICKUP`. For dealer pickup, enter the dealer code shown in the Dealers table. My Dyntree resolves the linked dealer and shows the pickup location on the reservation instead of the old static “Home delivery planned” text.
