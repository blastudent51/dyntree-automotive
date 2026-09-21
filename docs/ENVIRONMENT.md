# Prepared development environment

A new Neon project and development branch were created in the connected account. No existing project data was modified.

| Resource                  | Identifier              |
| ------------------------- | ----------------------- |
| Project                   | Dyntree Automotive      |
| Project ID                | rough-surf-38569996     |
| Region                    | aws-us-east-2           |
| Database                  | dyntree                 |
| Owner role                | dyntree_owner           |
| Development branch        | br-odd-forest-b49tezw5  |
| Production/default branch | br-fancy-truth-b4y6bklr |
| Airwallex test branch | br-raspy-firefly-b4uip3sw |

Production has been initialized with the committed migrations and vehicle catalog. The additive `202609200001_stripe_compatibility` migration was verified on the isolated `dev-stripe-schema-compatibility` branch (`br-damp-dew-b46sdene`) before being applied to production. It synchronizes the original Stripe column names with the provider-neutral names so either deployed client version can read and write reservations, payments, refunds and webhook records. Existing migration files and immutable snapshots were preserved.

No live payment was collected during verification. Integration-test reservations and payment records exist only on development branches. Connection strings and session secrets are excluded from the archive; obtain credentials from the Neon account. Production seeding must use `NODE_ENV=production` to avoid sample accounts.

The customer-deployed Vercel site is https://dyntree-automotive.vercel.app. Vercel deployment access and Clerk, Stripe and Resend secrets were not available in this repair session; authenticated live checkout and email delivery still require verification by the owner.

The additive `202609200002_vehicle_subscriptions` migration was verified on `dev-stripe-vehicle-subscriptions` (`br-royal-mountain-b4or2x9g`) and applied to production. It adds empty subscription/invoice tables without rewriting reservation data. Monthly signup remains disabled. See SUBSCRIPTIONS.md for activation steps.
