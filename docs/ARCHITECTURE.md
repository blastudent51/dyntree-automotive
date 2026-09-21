# Architecture and operations

## Application

Native Next.js App Router Server Components load catalog data and verify identity. Focused client components handle configuration, gallery, technology demonstrations, forms and dashboards. Typed Route Handlers use Zod validation, server authorization and origin checks. No client-only admin gate is trusted.

| Area           | Entry points                                                                   |
| -------------- | ------------------------------------------------------------------------------ |
| Marketing      | `app/page.tsx`, `components/marketing.tsx`, `components/information-pages.tsx` |
| Discovery      | `/vehicles/m1e`, `/vehicles/m1e/compare`, `/vehicles/m1e/gallery`              |
| Configuration  | `/configure/m1e`, `lib/configuration.ts`, `lib/image-resolver.ts`              |
| Accounts       | `/account`, `lib/auth.ts`, `/api/account`, `/api/configurations`               |
| Reservations   | `/reserve`, `/api/checkout`, `lib/payments.ts`, `/api/stripe/webhook`          |
| Administration | `/admin`, `lib/admin.ts`, `lib/admin-resources.ts`, `/api/admin/*`             |
| Email          | `lib/email.ts`, `lib/email-delivery.ts`, `/api/jobs/email`                     |
| Persistence    | `prisma/schema.prisma`, migrations, `prisma/seed.ts`                           |

The retained Sites/Vinext harness and sample D1/Drizzle files are unused by the production app. Production uses Next.js, Clerk and Prisma/PostgreSQL.

## Data

Models use UUIDs internally except infrastructure keys such as counters and deduplication keys. Saved configurations receive an `M1E-...` code; confirmed reservations receive sequential `DYN-M1E-000001`-style numbers.

`Vehicle` owns `VehicleTrim` and `VehicleImage`. Paint, wheel, interior, package and accessory models store integer-cent prices, active status and compatible/included trim slugs. Basic pricing and compatibility are database-driven. The Dynamic Package's wheel inclusion rule is centralized in `lib/configuration.ts`.

`User` owns saved configurations and reservations. `Reservation` holds checkout contact/addresses, deposit, refundable status, agreement acceptance, payment linkage and production status. `ReservationConfigurationSnapshot` preserves exact configuration, line prices and terms. A PostgreSQL trigger prohibits its mutation and deletion.

`Payment`, `Refund`, `OrderStatusHistory`, `AdminAuditLog`, `WebhookEvent`, `RateLimit`, `Counter`, `SiteSetting` and `EmailOutbox` support integrity and operations. `Dealer` holds future real locations, coordinates, contacts and pickup/delivery/service flags. Current checkout offers home delivery without final shipping charges; dealer pickup remains a future capability.

## Reservation lifecycle

1. A verified customer submits a compatible configuration, contact information, addresses and agreement acceptance.
2. Server recomputes pricing and writes the immutable snapshot.
3. Stripe Checkout receives the deposit with a reservation-specific idempotency key.
4. A signed event verifies amount/currency and atomically claims the pending reservation. One counter allocates its number; payment, history and email records are committed in the same transaction.
5. Duplicate events cannot create another number. Refund-before-payment events reconcile through Stripe PaymentIntent metadata. Older partial events cannot undo a recorded full refund.
6. Admin progresses the timeline. Backward progression and reopening a cancelled reservation are rejected.

Statuses: Reserved → Configuration Saved → Awaiting Production → Order Invitation → Order Confirmed → Scheduled for Production → In Production → Quality Inspection → Ready to Ship → Shipped → Delivered. Cancelled is a separate terminal state. These operational milestones do not imply manufacturing exists today.

Refunds require authorization, confirmation text, reason and a bounded amount. A reservation row lock prevents allocating more than the paid balance. Local/Stripe refund IDs reconcile webhook/API races. Full refunds cancel the reservation and add history. Customer cancellation and payment refund are separate operations.

## Security

- Clerk verified identity/email; database roles and ownership checks for private operations.
- Explicit development gates reject local auth and payment simulation in production.
- HTTP-only SameSite sessions, same-origin mutation checks and shared PostgreSQL rate limits.
- Stripe raw-body signature verification, transactional event deduplication and no stored card data.
- Local image paths or exact configured HTTPS CDN host only.
- Escaped email templates and Resend idempotency keys.
- Sanitized client errors and frame/no-sniff/referrer/browser-permissions headers.

No independent penetration test, browser accessibility audit or load test is claimed. Production requires actual provider/domain configuration and a deployment smoke test.

## Artwork

The 35 original vehicle WebPs and nine SVG screen mockups are concept imagery. Render generation used a master reference and edit-derived variants to preserve the same two-door proportions, glazing, Y lights, wheelbase and charging-port position as consistently as generative illustration permits. They are not engineering/CAD evidence.

| Coverage      | Included                                                                                 |
| ------------- | ---------------------------------------------------------------------------------------- |
| Paints        | Branch White, Graphite, Midnight Black, Volt Blue, Copper Leaf, Crimson, Forest Metallic |
| Trims         | Divide, Subtract, Add, Multiply front/rear three-quarter views                           |
| Wheels        | 19-inch Aero Sport, 19-inch Dynamic, 20-inch Dynamic Performance                         |
| Interiors     | Graphite, Cloud, Copper, Multiply Sport                                                  |
| Exterior      | Front/rear three-quarter, side, front, rear, elevated front                              |
| Cabin/details | Cockpit, dashboard, front/rear seats, console, headlight, taillight, charging port       |
| Scenes        | Architectural studio/hero, night, driving, charging                                      |
| Screens       | Home, navigation, CarPlay concept, media, climate, charging, Drive, performance, cluster |

Files follow `/public/cars/m1e/{trim}/{paint}/{wheel}/{angle}.webp` plus `interior/`, `details/` and `hero/`. Not every trim × paint × wheel combination has a render. The resolver ranks active metadata matches, gracefully selects the closest view and discloses approximations. Wheel selection shows the matching detail; interior selection shows its cabin. This is not a 3D CAD configurator.

Replace images in admin without changing frontend code: assign a local/CDN URL, accessible alt text, trim/paint/wheel/interior, angle/category, priority and active status. Increase priority for a preferred matching replacement and deactivate obsolete metadata. The bundled hero is a final fallback.

Prompts and lineage are in `docs/assets/generation-manifest.json` and `generation-brief.md`. The archive ships optimized images rather than larger intermediate PNGs. To import regenerated source artwork:

```sh
npm run assets:import -- /absolute/artwork/folder
npm run assets:screens
npm run check:assets
```

The folder must contain `manifest.json` and its referenced source PNGs. Screen generation appends the nine exact mockups. Reseeding adds new URLs and preserves admin-edited existing records.

## Editable vehicle specification keys

`Vehicle.specs` stores JSON scalar values. Missing keys use the initial prototype defaults:

| Key                           | Initial value                    |
| ----------------------------- | -------------------------------- |
| body                          | All-electric, two-door 2+2 coupe |
| seats                         | 4                                |
| batteryGross / batteryUsable  | 77 / 72 kWh                      |
| voltage                       | 400                              |
| dcKW / acKW                   | 185 / 11.5                       |
| connector                     | SAE J3400 / NACS                 |
| fastChargeMinutes             | 27–30                            |
| centerDisplay / driverDisplay | 14 / 10.25 inches                |

Trim power, acceleration, range, drivetrain, wheels and comparison equipment are separate editable fields. Some editorial copy and demonstration screen values remain authored content and need review when specifications change; gauges are illustrative, not live vehicle data.

## Attribution and future work

The website credits [LIVI upstream](https://github.com/f-io/LIVI). Future real distribution must respect its upstream license and third-party integration requirements. Website mockups are original components; no operational LIVI application is bundled. CarPlay/Android Auto are integration targets with no certification or license grant claimed.

Admin lists load 250 records at a time with a load-more control; search filters loaded records. Audit logs preserve administrator, action, target, timestamp and before/after values. Deactivate catalog entries rather than deleting historical context.

Full vehicle purchasing, financing, tax/title/registration, delivery quotes, dealer pickup, carriers and certified vehicle APIs require additional real business/provider integrations. The schema and timeline prepare for that evolution while the current experience remains a prototype reservation platform.
