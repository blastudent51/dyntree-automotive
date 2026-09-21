# Dyntree Automotive

An original premium electric-automaker website and reservation platform for the development-prototype **Dyntree M1E**. Built with Next.js 16.3.4, React 19, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion, PostgreSQL, Prisma, Zod, React Hook Form, Clerk, Stripe and Resend.

**Technology that grows.**

## Included

- Cinematic automotive homepage, M1E overview, four-trim comparison, filtered gallery, charging, supervised Dyntree Drive, company, searchable support, software and LIVI pages.
- Responsive eight-step configurator with database prices and compatibility, seven paints, three wheel options, four interiors, packages, accessories, URL sharing and saved configuration IDs.
- 35 original AI-generated prototype renders, nine original SVG infotainment mockups, interactive LIVI and phone-key demonstrations, and a sensor diagram. No relabeled production-car photography.
- Image metadata resolver with nearest-available disclosure, angle controls, fullscreen, zoom, keyboard, swipe and pinch interactions.
- Customer accounts, My Garage, saved configurations, reservations, profile and delivery information, payment history and production timelines.
- Account-required Stripe Checkout, signed webhooks, idempotent processing, immutable price/configuration snapshots and sequential reservation numbers. Explicit development-only payment simulation.
- Server-authorized administration for catalog, prices, compatibility, images, reservations, users, production status, refunds, active dealer locations, announcements and settings, with audit logs.
- Seven escaped HTML/text email templates, persistent outbox, Resend delivery and local console previews.
- Versioned PostgreSQL migration, idempotent seed, development-only sample identities, production admin bootstrap, linting, tests, type checking and native Next.js production build.

## Run locally

Use Node.js 22.13+ and npm. This implementation uses Neon PostgreSQL through Prisma's Neon adapter. Use a **development database branch** separate from production.

```sh
cp .env.example .env.local
npm install
```

Set `DATABASE_URL` to the pooled Neon connection string and `DATABASE_URL_UNPOOLED` to the direct connection string. Set `NEXT_PUBLIC_APP_URL=http://localhost:3000`. Generate a secret and place it in `DEV_SESSION_SECRET`:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000`. With the explicit development flags enabled and Clerk/Stripe keys absent, `/account` offers the seeded `customer@example.com` and `admin@example.com` identities. These use signed development sessions, **not fixed passwords**. A simulated reservation collects no funds and is clearly labeled. Both development mechanisms refuse to run under `NODE_ENV=production`.

Without `DATABASE_URL`, the public experience can display the bundled catalog and artwork. Saving, accounts, administration and payments require the database. A configured but unseeded database is treated as an error rather than silently accepting reservations against fallback data.

## Guides

- [Setup and Vercel deployment](docs/SETUP.md)
- [Dealer network and pickup](docs/DEALERS.md)
- [Stripe setup and migration from Airwallex](docs/STRIPE.md)
- [Architecture, operations and image replacement](docs/ARCHITECTURE.md)
- [Verification and remaining checks](docs/VERIFICATION.md)
- [Prepared development environment](docs/ENVIRONMENT.md)
- [Original asset generation brief](docs/assets/generation-brief.md)
- [Detailed generation manifest](docs/assets/generation-manifest.json)

## Commands

| Command                              | Purpose                                                               |
| ------------------------------------ | --------------------------------------------------------------------- |
| `npm run dev`                           | Native Next.js development server                                     |
| `npm run build`                         | Generate Prisma client and build production Next.js                   |
| `npm start`                         | Serve the native production build                                     |
| `npm run lint`                          | ESLint                                                                |
| `npm run typecheck`                     | Strict TypeScript check                                               |
| `npm test`                          | Unit tests; database tests skip unless explicitly enabled             |
| `npm run test:db`                       | Database and authenticated API tests against the development database |
| `npm run check:assets`                  | Verify local assets and required coverage                             |
| `npm run db:migrate`                    | Apply versioned migrations                                            |
| `npm run db:seed`                       | Add seed data without overwriting existing admin edits                |
| `npm run db:studio`                     | Prisma Studio                                                         |
| `npm run admin:bootstrap -- user_CLERK_ID` | Grant an existing Clerk user an audited admin role                    |
| `npm run email:previews`                | Regenerate sample email HTML                                          |
| `npm run validate`                      | Lint, type check, unit tests and production build                     |

## Publication status

The native Next.js production build is the Vercel deployment target. This project has not been published: the available Sites account reached its hosting limit before a Site could be created. The separate managed browser preview encountered a runtime compatibility error. Desktop/mobile visual browser QA remains to be completed on native Next.js or a Vercel preview.

Live Clerk sign-in, Stripe payments and Resend delivery require service credentials and domain configuration. No secret credentials or database connection strings are included. The optional `dev:sites-preview` command and starter compatibility files are not used by the production Next.js build.

## Product boundaries

The M1E is a development prototype available for reservations only. The site does not sell a completed vehicle, charge final delivery fees, show invented dealers, promise production dates, claim certified range/crash ratings, or claim autonomous driving. Dyntree Drive is supervised Level 2 assistance requiring an attentive driver. Specifications, imagery, equipment, availability, performance, pricing and production timing may change.

LIVI is an independent upstream open-source project. The site illustrates a proposed integration and original theme; it does not distribute an operational automotive computer, CarPlay license or production ADAS implementation. The Raspberry Pi 5 devkit is a future development reference, not a final automotive controller.

## Monthly vehicle subscriptions

Stripe Subscriptions replaces the public finance/lease estimate flow. Customers review invitations in My Dyntree, subscribe through Stripe Checkout, and manage invoices/payment methods/cancellation in the billing portal. Reservation deposits remain separate. See [subscription setup](docs/SUBSCRIPTIONS.md) for the two new environment variables, Stripe Price and portal configuration, webhook events and deployment migration. Signup ships disabled until real terms, pricing and vehicle availability are configured.
