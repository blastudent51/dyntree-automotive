import { getUser, devAuthEnabled } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getCatalog } from "@/lib/catalog";
import {
  AccountPortal,
  AccountSignIn,
  type AccountData,
} from "@/components/account";
export const dynamic = "force-dynamic";
export const metadata = { title: "My Dyntree" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; subscription?: string }>;
}) {
  const params = await searchParams;
  const user = process.env.DATABASE_URL ? await getUser() : null;
  if (!user)
    return (
      <main id="main">
        <AccountSignIn
          dev={devAuthEnabled()}
          clerk={!!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
          returnTo={params.returnTo}
        />
      </main>
    );
  const db = getDb();
  const [catalog, configurations, reservations, dealers] = await Promise.all([
    getCatalog(),
    db.savedConfiguration.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
    db.reservation.findMany({
      where: {
        userId: user.id,
        paymentStatus: { in: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] },
      },
      include: {
        snapshot: true,
        history: { orderBy: { createdAt: "asc" } },
        payments: true,
        refunds: true,
        dealer: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    db.dealer.findMany({
      where: { active: true, pickup: true },
      orderBy: [{ state: "asc" }, { city: "asc" }, { name: "asc" }],
    }),
  ]);
  return (
    <AccountPortal
      catalog={catalog}
      initial={
        JSON.parse(
          JSON.stringify({ user, configurations, reservations, dealers }),
        ) as AccountData
      }
      dev={devAuthEnabled()}
      subscriptionRequested={params.subscription !== undefined}
    />
  );
}
