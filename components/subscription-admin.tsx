"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { apiResult } from "@/lib/client-api";
import { preciseMoney } from "@/lib/purchase-planning";

type LeaseResult = {
  stripePriceId: string;
  offer: {
    termMonths: number;
    annualMiles: number;
    downPercent: number;
    monthlyCents: number;
    dueAtSigningCents: number;
    residualCents: number;
    residualPercent: number;
    acquisitionFeeCents: number;
    dispositionFeeCents: number;
    excessMileageCents: number;
    allowedMiles: number;
    totalCents: number;
  };
};

export function SubscriptionAdmin({ onSaved }: { onSaved: () => void }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<LeaseResult | null>(null);

  return (
    <form
      className="purchase-planner"
      onSubmit={async (e) => {
        e.preventDefault();
        setMessage("");
        setResult(null);
        setBusy(true);
        const data = new FormData(e.currentTarget);
        try {
          const r = await fetch("/api/admin/subscription-invitations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reservationNumber: data.get("reservationNumber"),
              termMonths: Number(data.get("termMonths")),
              downPercent: Number(data.get("downPercent")),
              annualMiles: Number(data.get("annualMiles")),
              confirmLease: data.get("confirmLease") === "on",
            }),
          });
          const body = await apiResult(r);
          if (!r.ok)
            throw Error(body.error || "Could not generate lease offer.");

          setResult(body as unknown as LeaseResult);
          setMessage(
            "Lease offer generated. Stripe Product/Price creation and the customer invitation are complete.",
          );
          onSaved();
        } catch (error) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Could not generate lease offer.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>Generate a Stripe lease offer</h2>
      <p className="fine-print">
        Enter a paid reservation and the lease terms. Dyntree calculates the
        monthly payment from the reservation&apos;s locked vehicle price and the
        purchase-planning assumptions, then creates the recurring Stripe Price
        automatically. You no longer need to make a Price manually in the
        Stripe Dashboard.
      </p>

      <label>
        Reservation number
        <input
          className="text-input"
          name="reservationNumber"
          placeholder="DYN-M1E-000001"
          pattern="DYN-M1E-[0-9]{6,}"
          required
        />
      </label>

      <div className="purchase-inputs">
        <label>
          Lease term
          <select name="termMonths" defaultValue="36">
            <option value="24">24 months</option>
            <option value="36">36 months</option>
            <option value="48">48 months</option>
          </select>
        </label>

        <label>
          Annual mileage
          <select name="annualMiles" defaultValue="10000">
            <option value="10000">10,000 miles/year</option>
            <option value="12000">12,000 miles/year</option>
            <option value="15000">15,000 miles/year</option>
          </select>
        </label>

        <label>
          Capitalized cost reduction
          <select name="downPercent" defaultValue="0">
            <option value="0">0%</option>
            <option value="5">5%</option>
            <option value="10">10%</option>
            <option value="15">15%</option>
            <option value="20">20%</option>
          </select>
        </label>
      </div>

      <label className="agreement-check">
        <input type="checkbox" name="confirmLease" required />I confirm these
        lease assumptions are the terms I want attached to this reservation.
        Stripe is being used for payment collection; it does not underwrite or
        approve the vehicle lease.
      </label>

      <Button type="submit" disabled={busy}>
        {busy ? "Generating in Stripe…" : "Generate lease price & invitation"}
      </Button>

      {message && <p role="status">{message}</p>}

      {result && (
        <div className="purchase-breakdown" aria-live="polite">
          <p>
            Monthly payment <strong>{preciseMoney(result.offer.monthlyCents)}</strong>
          </p>
          <p>
            Due at signing <strong>{preciseMoney(result.offer.dueAtSigningCents)}</strong>
          </p>
          <p>
            Term / mileage <strong>{result.offer.termMonths} months · {result.offer.annualMiles.toLocaleString("en-US")} miles/year</strong>
          </p>
          <p>
            Assumed residual <strong>{result.offer.residualPercent}% · {preciseMoney(result.offer.residualCents)}</strong>
          </p>
          <p>
            Stripe Price <code>{result.stripePriceId}</code>
          </p>
          <small>
            The offer can be generated while a paid reservation is still in
            production. Customer checkout remains blocked until the vehicle is
            Ready to ship, Shipped or Delivered.
          </small>
        </div>
      )}
    </form>
  );
}
