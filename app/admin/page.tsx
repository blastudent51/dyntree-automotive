import { getUser, devAuthEnabled } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { AdminPanel } from '@/components/admin-panel';
import { AccountSignIn } from '@/components/account';
import Link from 'next/link';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Dyntree administration',
  robots: { index: false, follow: false },
};
export default async function Page() {
  const user = process.env.DATABASE_URL ? await getUser() : null;
  if (!user)
    return (
      <main id="main">
        <AccountSignIn
          dev={devAuthEnabled()}
          clerk={!!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
          returnTo="/admin"
        />
      </main>
    );
  if (user.role !== 'ADMIN')
    return (
      <main id="main" className="page-content">
        <h1>Administrator access required.</h1>
        <p>This account does not have permission to access Dyntree operations.</p>
        <Link href="/account" className="text-link">
          Return to My Dyntree
        </Link>
      </main>
    );
  const records = await getDb().vehicle.findMany();
  return (
    <AdminPanel
      initial={JSON.parse(JSON.stringify(records))}
      adminName={`${user.firstName} ${user.lastName}`}
    />
  );
}
