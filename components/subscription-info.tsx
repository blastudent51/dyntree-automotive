import Link from "next/link";
export function SubscriptionInfo() {
  return (
    <section className="purchase-planner">
      <p className="eyebrow">DYNTREE / MONTHLY</p>
      <h3>One vehicle. A monthly subscription.</h3>
      <p className="purchase-notice">
        Monthly billing will use Stripe Subscriptions. Your monthly price and
        vehicle-use terms are provided in a separate invitation when your
        vehicle is ready. There is no loan, APR, or promise of ownership.
      </p>
      <p className="fine-print">
        A reservation does not start a subscription. Vehicles are not yet being
        delivered, and monthly billing is not open for general signup.
      </p>
      <Link className="text-link" href="/subscriptions">
        Explore monthly subscriptions →
      </Link>
    </section>
  );
}
