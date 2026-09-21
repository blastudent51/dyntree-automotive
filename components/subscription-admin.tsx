"use client";
import { useState } from "react";
import { Button } from "./ui/button";
import { apiResult } from "@/lib/client-api";
export function SubscriptionAdmin({ onSaved }: { onSaved: () => void }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="purchase-planner"
      onSubmit={async (e) => {
        e.preventDefault();
        setMessage("");
        setBusy(true);
        const data = new FormData(e.currentTarget);
        try {
          const r = await fetch("/api/admin/subscription-invitations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reservationNumber: data.get("reservationNumber"),
              priceId: data.get("priceId"),
              confirmReady: data.get("confirmReady") === "on",
            }),
          });
          const result = await apiResult(r);
          if (!r.ok)
            throw Error(result.error || "Could not create invitation.");
          setMessage(
            "Invitation created in the customer account. No charge was made.",
          );
          onSaved();
        } catch (e) {
          setMessage(
            e instanceof Error ? e.message : "Could not create invitation.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>Invite a ready vehicle to monthly billing</h2>
      <p className="fine-print">
        Set the monthly price in Stripe and publish vehicle-subscriptions terms
        under Site settings first. Only paid reservations at Ready to ship,
        Shipped or Delivered qualify. The customer must accept and complete
        Stripe Checkout; this form does not charge them.
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
      <label>
        Stripe monthly Price ID
        <input
          className="text-input"
          name="priceId"
          placeholder="price_…"
          pattern="price_[A-Za-z0-9]+"
          required
        />
      </label>
      <label className="agreement-check">
        <input type="checkbox" name="confirmReady" required />I confirm vehicle
        availability and that this recurring price and the published terms cover
        this exact configuration.
      </label>
      <Button type="submit" disabled={busy}>
        Create subscription invitation
      </Button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
