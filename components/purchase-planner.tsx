"use client";
import { useId } from "react";
import {
  defaultPurchasePreference,
  defaultPurchaseSettings,
  estimatePurchase,
  preciseMoney,
  purchaseDisclosure,
  type PurchasePreference,
  type PurchaseSettings,
  type PurchaseEstimate,
} from "@/lib/purchase-planning";

export function PurchaseEstimateSummary({
  estimate,
}: {
  estimate: PurchaseEstimate;
}) {
  const e = estimate;
  return (
    <div className="purchase-breakdown">
      {e.method === "cash" ? (
        <p>
          Estimated vehicle price <strong>{preciseMoney(e.totalCents)}</strong>
        </p>
      ) : (
        <>
          <p>
            Estimated monthly payment{" "}
            <strong>{preciseMoney(e.monthlyCents)}</strong>
          </p>
          <p>
            {e.method === "finance"
              ? "Planned down payment"
              : "Capitalized cost reduction"}{" "}
            <strong>{preciseMoney(e.downCents)}</strong>
          </p>
          {e.method === "finance" ? (
            <>
              <p>
                Estimated amount financed{" "}
                <strong>{preciseMoney(e.principalCents)}</strong>
              </p>
              <p>
                Estimated interest over term{" "}
                <strong>{preciseMoney(e.interestCents)}</strong>
              </p>
              <p>
                Total including down payment{" "}
                <strong>{preciseMoney(e.totalCents)}</strong>
              </p>
              <small>
                Final installment: {preciseMoney(e.finalPaymentCents)}. Assumes
                fixed interest, monthly payments and no loan fees; assumed APR
                equals the interest rate in this model.
              </small>
            </>
          ) : (
            <>
              <p>
                Due at future lease signing{" "}
                <strong>{preciseMoney(e.dueAtSigningCents)}</strong>
              </p>
              <small>
                Includes {preciseMoney(e.downCents)} reduction,{" "}
                {preciseMoney(e.acquisitionFeeCents)} assumed acquisition fee
                and the first monthly payment. Nothing here is due during
                reservation.
              </small>
              <p>
                Assumed residual / money factor{" "}
                <strong>
                  {e.residualPercent}% / {e.moneyFactor.toFixed(5)}
                </strong>
              </p>
              <p>
                Assumed end value{" "}
                <strong>{preciseMoney(e.residualCents)}</strong>
              </p>
              <p>
                Total scheduled miles{" "}
                <strong>{e.allowedMiles.toLocaleString("en-US")}</strong>
              </p>
              <p>
                Assumed return fee{" "}
                <strong>{preciseMoney(e.dispositionFeeCents)}</strong>
              </p>
              <p>
                Total over term, including return fee{" "}
                <strong>{preciseMoney(e.totalCents)}</strong>
              </p>
              <small>
                First payment is counted once. Excludes excess wear and mileage;
                assumed excess mileage charge{" "}
                {preciseMoney(e.excessMileageCents)}/mile. Returning the vehicle
                does not transfer ownership. No purchase option is promised.
              </small>
            </>
          )}
        </>
      )}
    </div>
  );
}

export function PurchasePlanner({
  priceCents,
  value,
  onChange,
  settings = defaultPurchaseSettings,
  depositCents,
}: {
  priceCents: number;
  value?: PurchasePreference;
  onChange: (value: PurchasePreference) => void;
  settings?: PurchaseSettings;
  depositCents: number;
}) {
  const id = useId();
  const p = value || { method: "cash" as const };
  const estimate = estimatePurchase(priceCents, p, settings);
  return (
    <section className="purchase-planner" aria-labelledby={`${id}-title`}>
      <div className="purchase-heading">
        <div>
          <p className="eyebrow">OWNERSHIP, CONSIDERED.</p>
          <h3 id={`${id}-title`}>Plan your next chapter.</h3>
        </div>
        <span className="planning-badge">ESTIMATE ONLY</span>
      </div>
      <div
        className="purchase-methods"
        role="group"
        aria-label="Future payment preference"
      >
        {(["cash", "finance", "lease"] as const).map((method) => (
          <button
            type="button"
            key={method}
            aria-pressed={p.method === method}
            onClick={() =>
              onChange(defaultPurchasePreference(method, settings))
            }
          >
            {method === "cash"
              ? "Cash"
              : method === "finance"
                ? "Finance"
                : "Lease"}
          </button>
        ))}
      </div>
      <div className="purchase-amount" aria-live="polite" aria-atomic="true">
        <strong>
          {preciseMoney(
            estimate.method === "cash"
              ? estimate.totalCents
              : estimate.monthlyCents,
          )}
        </strong>
        {estimate.method !== "cash" && <span>/ month</span>}
        <p>
          {estimate.method === "cash"
            ? "Estimated vehicle price"
            : "Illustrative payment · excludes taxes and fees"}
        </p>
      </div>
      {p.method !== "cash" && (
        <div className="purchase-inputs">
          <label>
            Term
            <select
              value={p.termMonths}
              onChange={(e) =>
                onChange({
                  ...p,
                  termMonths: Number(e.target.value),
                } as PurchasePreference)
              }
            >
              {(p.method === "finance"
                ? [36, 48, 60, 72, 84]
                : [24, 36, 48]
              ).map((n) => (
                <option key={n} value={n}>
                  {n} months
                </option>
              ))}
            </select>
          </label>
          <label>
            {p.method === "finance"
              ? "Down payment"
              : "Capitalized cost reduction"}
            <select
              value={p.downPercent}
              onChange={(e) =>
                onChange({ ...p, downPercent: Number(e.target.value) })
              }
            >
              {Array.from(
                new Set([
                  0,
                  5,
                  10,
                  15,
                  20,
                  ...(p.method === "finance" ? [30, 40, 50] : []),
                  p.downPercent,
                ]),
              )
                .sort((a, b) => a - b)
                .map((n) => (
                  <option key={n} value={n}>
                    {n}% · {preciseMoney(Math.round((priceCents * n) / 100))}
                  </option>
                ))}
            </select>
          </label>
          {p.method === "finance" ? (
            <label>
              Assumed APR (%)
              <input
                type="number"
                min="0"
                max="30"
                step="0.01"
                value={p.apr}
                onChange={(e) => {
                  const n = e.target.valueAsNumber;
                  if (Number.isFinite(n) && n >= 0 && n <= 30)
                    onChange({ ...p, apr: n });
                }}
              />
              <small>Editable assumption, not an offered rate.</small>
            </label>
          ) : (
            <label>
              Annual mileage
              <select
                value={p.annualMiles}
                onChange={(e) =>
                  onChange({
                    ...p,
                    annualMiles: Number(e.target.value) as
                      10000 | 12000 | 15000,
                  })
                }
              >
                {[10000, 12000, 15000].map((n) => (
                  <option value={n} key={n}>
                    {n.toLocaleString("en-US")} miles
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}
      <details className="purchase-details">
        <summary>View assumptions & payment breakdown</summary>
        <PurchaseEstimateSummary estimate={estimate} />
      </details>
      <p className="purchase-notice">{purchaseDisclosure}</p>
      <div className="purchase-deposit">
        <span>Reservation deposit today</span>
        <strong>{preciseMoney(depositCents)}</strong>
      </div>
      <p className="fine-print">
        Saving this preference does not submit a credit application or authorize
        future monthly charges. No credit check is performed.
      </p>
    </section>
  );
}
