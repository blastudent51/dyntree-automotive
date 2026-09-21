"use client";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { apiResult } from "@/lib/client-api";
import { preciseMoney } from "@/lib/purchase-planning";
type Record = {
  id: string;
  status: string;
  monthlyCents: number;
  livemode: boolean;
  termsVersion: string;
  stripeSubscriptionId: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  termsSnapshot: {
    terms: string;
    automaticTax: boolean;
    taxBehavior: string;
    cancellation: string;
  };
  reservation: { number: string };
  invoices: {
    stripeInvoiceId: string;
    status: string;
    amountDueCents: number;
    amountPaidCents: number;
    createdAt: string;
  }[];
};
export function SubscriptionAccount() {
  const [records, setRecords] = useState<Record[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState("");
  const [agreed, setAgreed] = useState<{ [key: string]: boolean }>({});
  useEffect(() => {
    let active = true;
    fetch("/api/subscriptions")
      .then(async (r) => {
        const data = await apiResult(r);
        if (!r.ok) throw Error(data.error || "Could not load subscriptions.");
        if (active) {
          setRecords(data.records as unknown as Record[]);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refresh]);
  async function action(record: Record, portal: boolean) {
    setError("");
    setBusy(record.id);
    try {
      const r = await fetch(
        `/api/subscriptions/${portal ? "portal" : "checkout"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            portal
              ? { id: record.id }
              : {
                  id: record.id,
                  agree: true,
                  termsVersion: record.termsVersion,
                },
          ),
        },
      );
      const result = await apiResult(r);
      if (!r.ok) throw Error(result.error || "Could not open billing.");
      const url = new URL(result.url, window.location.origin);
      if (
        !(
          url.origin === window.location.origin && url.pathname === "/account"
        ) &&
        !(
          url.protocol === "https:" &&
          ["checkout.stripe.com", "billing.stripe.com"].includes(url.hostname)
        )
      )
        throw Error("Unexpected billing destination.");
      window.location.assign(url.href);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open billing.");
    } finally {
      setBusy("");
    }
  }
  return (
    <section>
      <div className="garage-heading">
        <h2>Monthly subscriptions</h2>
        <Button variant="outline" onClick={() => setRefresh((n) => n + 1)}>
          Refresh billing status
        </Button>
      </div>
      <p className="fine-print">
        Stripe confirms billing through signed webhooks. Returning from checkout
        alone does not confirm payment. Monthly subscription invoices are
        separate from reservation deposits.
      </p>
      {loading && <p>Loading subscriptions…</p>}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {!loading && !error && !records.length && (
        <div className="empty-state">
          <h3>No subscription invitations yet.</h3>
          <p>
            Your invitation appears here when your vehicle is ready. Reserving
            does not start recurring payments.
          </p>
        </div>
      )}
      {records.map((r) => (
        <article className="purchase-planner" key={r.id}>
          <p className="eyebrow">
            {r.reservation.number} {!r.livemode && "· STRIPE TEST MODE"}
          </p>
          <h3>{preciseMoney(r.monthlyCents)} / month</h3>
          <p>
            {r.status.replaceAll("_", " ")}
            {r.cancelAtPeriodEnd && " · Cancellation scheduled"}
          </p>
          {r.currentPeriodEnd && (
            <p>
              Current billing period ends{" "}
              {new Date(r.currentPeriodEnd).toLocaleDateString("en-US")}
            </p>
          )}
          <p className="fine-print">
            {r.termsSnapshot.taxBehavior === "inclusive"
              ? "Price includes configured taxes."
              : "Applicable taxes are additional."}{" "}
            First payment at checkout. Renews monthly until cancelled. No
            ownership transfer.
          </p>
          <details className="purchase-details">
            <summary>Subscription terms · {r.termsVersion}</summary>
            <p style={{ whiteSpace: "pre-wrap" }}>{r.termsSnapshot.terms}</p>
            <p>{r.termsSnapshot.cancellation}</p>
          </details>
          {r.status === "INVITED" && !r.stripeSubscriptionId ? (
            <>
              <label className="agreement-check">
                <input
                  type="checkbox"
                  checked={!!agreed[r.id]}
                  onChange={(e) =>
                    setAgreed({ ...agreed, [r.id]: e.target.checked })
                  }
                />
                I accept these terms and authorize the monthly recurring charge
                shown, plus applicable taxes, starting at checkout.
              </label>
              <Button
                disabled={!agreed[r.id] || !!busy}
                onClick={() => action(r, false)}
              >
                {busy === r.id ? "Opening Stripe…" : "Subscribe with Stripe"}
              </Button>
            </>
          ) : (
            <Button
              disabled={!r.stripeSubscriptionId || !!busy}
              onClick={() => action(r, true)}
            >
              Manage billing & cancellation
            </Button>
          )}
          {r.invoices.length > 0 && (
            <details className="purchase-details">
              <summary>Recent subscription invoices</summary>
              {r.invoices.map((i) => (
                <p key={i.stripeInvoiceId}>
                  {new Date(i.createdAt).toLocaleDateString("en-US")} ·{" "}
                  {i.status} · Paid {preciseMoney(i.amountPaidCents)} / Due{" "}
                  {preciseMoney(i.amountDueCents)}
                </p>
              ))}
            </details>
          )}
        </article>
      ))}
    </section>
  );
}
