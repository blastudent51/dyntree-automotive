import Link from "next/link";
import { ArrowUpRight, MapPin, CarFront, Wrench, Store, Truck } from "lucide-react";
import { getDb } from "@/lib/db";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dyntree Dealers" };

export default async function DealersPage() {
  const dealers = process.env.DATABASE_URL
    ? await getDb().dealer.findMany({
        where: { active: true },
        orderBy: [{ state: "asc" }, { city: "asc" }, { name: "asc" }],
      })
    : [];

  return (
    <main id="main" className="page-content dealers-page">
      <section className="dealers-hero">
        <p className="eyebrow">DYNTREE DEALERS</p>
        <h1>Closer to the road.</h1>
        <p>
          Explore active Dyntree locations for showroom visits, vehicle pickup,
          delivery support, and service as those capabilities become available.
        </p>
      </section>

      {dealers.length ? (
        <section className="dealer-grid" aria-label="Active Dyntree dealers">
          {dealers.map((dealer) => (
            <article className="dealer-card" key={dealer.id}>
              <div className="dealer-card-heading">
                <div>
                  <span className="status-badge">ACTIVE</span>
                  <h2>{dealer.name}</h2>
                </div>
                <MapPin aria-hidden="true" size={24} />
              </div>

              <address>
                {dealer.address}<br />
                {dealer.city}, {dealer.state} {dealer.zip}
              </address>

              <div className="dealer-services" aria-label="Location services">
                {dealer.showroom && (
                  <span><Store size={15} /> Showroom</span>
                )}
                {dealer.pickup && (
                  <span><CarFront size={15} /> Vehicle pickup</span>
                )}
                {dealer.delivery && (
                  <span><Truck size={15} /> Delivery support</span>
                )}
                {dealer.service && (
                  <span><Wrench size={15} /> Service</span>
                )}
              </div>

              <div className="dealer-contact">
                <a href={`tel:${dealer.phone}`}>{dealer.phone}</a>
                <a href={`mailto:${dealer.email}`}>{dealer.email}</a>
              </div>

              {dealer.pickup && (
                <Button asChild variant="outline">
                  <Link href="/configure/m1e">
                    Configure for pickup <ArrowUpRight size={15} />
                  </Link>
                </Button>
              )}
            </article>
          ))}
        </section>
      ) : (
        <section className="empty-state dealer-empty">
          <MapPin size={28} />
          <h2>No active dealer locations yet.</h2>
          <p>
            When a real Dyntree location is activated by an administrator, it
            will appear here automatically.
          </p>
        </section>
      )}

      <section className="dealer-disclaimer">
        <h2>Development-stage network.</h2>
        <p>
          A listed location means the dealer record is active on Dyntree&apos;s
          website. Vehicle production, test drives, inventory, delivery dates,
          service capability, and regulatory availability are separate and may
          still be in development. Check the services shown for each location.
        </p>
      </section>
    </main>
  );
}
