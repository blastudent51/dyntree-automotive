import { getCatalog } from '@/lib/catalog';
import { getUser, devAuthEnabled } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { configurationFromQuery } from '@/lib/configuration';
import { localSimulationEnabled } from '@/lib/security';
import { AccountSignIn, type AccountUser } from '@/components/account';
import { ReservationForm } from '@/components/reservation-form';
import type { DealerSummary } from '@/lib/types';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Reserve your M1E' };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const q = new URLSearchParams(
    Object.entries(params).filter((v): v is [string, string] => typeof v[1] === 'string'),
  );
  const user = process.env.DATABASE_URL ? await getUser() : null;
  if (!user)
    return (
      <main id="main">
        <AccountSignIn
          dev={devAuthEnabled()}
          clerk={!!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
          returnTo={`/reserve?${q}`}
        />
      </main>
    );
  const [catalog, dealers] = await Promise.all([
    getCatalog(),
    getDb().dealer.findMany({
      where: { active: true, pickup: true },
      orderBy: [{ state: 'asc' }, { city: 'asc' }, { name: 'asc' }],
    }),
  ]);
  return (
    <ReservationForm
      catalog={catalog}
      configuration={configurationFromQuery(catalog, q)}
      user={JSON.parse(JSON.stringify(user)) as AccountUser}
      dealers={JSON.parse(JSON.stringify(dealers)) as DealerSummary[]}
      simulation={localSimulationEnabled()}
      paymentsReady={
        !!process.env.STRIPE_SECRET_KEY &&
        !!process.env.STRIPE_WEBHOOK_SECRET &&
        (!process.env.STRIPE_SECRET_KEY.startsWith('sk_live_') ||
          process.env.ENABLE_LIVE_PAYMENTS === 'true')
      }
    />
  );
}
