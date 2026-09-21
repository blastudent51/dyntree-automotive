import Link from "next/link";
import { Button } from "@/components/ui/button";
export const metadata = { title: "Monthly vehicle subscriptions" };
export default function Page() {
  return (
    <main id="main" className="page-content financing-page">
      <div className="section-heading">
        <p className="eyebrow">DYNTREE / MONTHLY</p>
        <h1>
          Your drive.
          <br />
          One monthly subscription.
        </h1>
        <p>
          Recurring billing through Stripe. No loan or APR. Vehicle access,
          mileage, insurance, return obligations and cancellation terms will be
          set out in your subscription invitation.
        </p>
      </div>
      <div className="financing-paths subscription-paths">
        <article>
          <span>01 / RESERVE</span>
          <h2>Start with your M1E.</h2>
          <p>
            Choose your configuration and place a reservation. The reservation
            deposit is a separate one-time payment and does not start monthly
            billing.
          </p>
        </article>
        <article>
          <span>02 / REVIEW</span>
          <h2>Your price. Your terms.</h2>
          <p>
            When your vehicle is ready, review your personal invitation in My
            Dyntree. It includes the monthly price, applicable tax treatment and
            vehicle-use terms. No monthly price has been announced yet.
          </p>
        </article>
        <article>
          <span>03 / SUBSCRIBE</span>
          <h2>Billing you can manage.</h2>
          <p>
            Accept the terms and complete secure Stripe Checkout. The first
            monthly payment is collected at checkout, then renews monthly until
            cancellation. Manage payment methods, invoices and cancellation
            through the Stripe billing portal.
          </p>
        </article>
      </div>
      <div className="purchase-planner">
        <h2>Prototype today. More to come.</h2>
        <p>
          Vehicles are not yet being delivered. Subscription invitations are not
          open for general signup. A subscription is not a loan and does not
          transfer vehicle ownership. Cancelling renewal ends recurring billing
          at the end of the current billing period; vehicle return and other
          obligations follow your agreed terms.
        </p>
      </div>
      <Button asChild className="cta">
        <Link href="/configure/m1e">Configure M1E</Link>
      </Button>
      <Button asChild variant="outline">
        <Link href="/account">My subscriptions</Link>
      </Button>
    </main>
  );
}
