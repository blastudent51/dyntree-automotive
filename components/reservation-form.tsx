"use client";
import { SubscriptionInfo } from "./subscription-info";
import { apiResult } from "@/lib/client-api";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, LockKeyhole, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { Catalog, Configuration, DealerSummary } from "@/lib/types";
import {
  configurationQuery,
  money,
  priceConfiguration,
} from "@/lib/configuration";
import { resolveVehicleImage } from "@/lib/image-resolver";
import { reservationFormSchema } from "@/lib/validation";
import { type AccountUser } from "./account";
type FormValues = z.infer<typeof reservationFormSchema>;
export function ReservationForm({
  catalog,
  configuration: initialConfiguration,
  user,
  dealers,
  simulation,
  paymentsReady,
}: {
  catalog: Catalog;
  configuration: Configuration;
  user: AccountUser;
  dealers: DealerSummary[];
  simulation: boolean;
  paymentsReady: boolean;
}) {
  const configuration = initialConfiguration;
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [error, setError] = useState("");
  const quote = priceConfiguration(catalog, configuration);
  const asset = resolveVehicleImage(catalog.images, configuration).image;
  const trim = catalog.trims.find((x) => x.slug === configuration.trim)!;
  const empty = {
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "US" as const,
  };
  const form = useForm<FormValues>({
    resolver: zodResolver(reservationFormSchema),
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      billingAddress: user.billingAddress || empty,
      deliveryAddress: user.deliveryAddress || empty,
      deliveryMethod: "HOME_DELIVERY",
      dealerId: null,
      agreement: false,
    },
  });
  const deliveryMethod = form.watch("deliveryMethod");
  const selectedDealerId = form.watch("dealerId");
  const selectedDealer = dealers.find((dealer) => dealer.id === selectedDealerId);
  return (
    <main id="main" className="page-content reservation-page">
      <div className="section-heading">
        <p className="eyebrow">RESERVE YOUR DYNTREE M1E</p>
        <h1>A place in what&apos;s next.</h1>
        <p>
          Your reservation begins the journey. A final purchase agreement will
          follow only when Dyntree is ready for vehicle ordering.
        </p>
      </div>
      <div className="checkout-layout">
        <form
          className="checkout-form"
          onSubmit={form.handleSubmit(async (values) => {
            setError("");
            try {
              const response = await fetch("/api/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ...values,
                  configuration,
                  agreementVersion: catalog.settings.agreementVersion,
                  idempotencyKey,
                }),
              });
              const result = await apiResult(response);
              if (!response.ok) throw Error(result.error || "Checkout failed.");
              if (
                typeof result.url !== "string" ||
                !(
                  result.url.startsWith("/account?") ||
                  new URL(result.url).hostname === "checkout.stripe.com"
                )
              )
                throw Error("Unexpected checkout destination.");
              window.location.assign(result.url);
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Could not start checkout.",
              );
            }
          })}
        >
          <h2>
            01 <span>Your details</span>
          </h2>
          <div className="form-row">
            {(["firstName", "lastName"] as const).map((k) => (
              <label key={k}>
                {k === "firstName" ? "First name" : "Last name"}
                <input
                  {...form.register(k)}
                  autoComplete={
                    k === "firstName" ? "given-name" : "family-name"
                  }
                  className="text-input"
                  required
                />
                {form.formState.errors[k] && (
                  <small className="field-error">
                    {form.formState.errors[k]?.message}
                  </small>
                )}
              </label>
            ))}
          </div>
          <label>
            Email
            <input
              {...form.register("email")}
              readOnly
              type="email"
              autoComplete="email"
              className="text-input"
            />
          </label>
          <label>
            Phone
            <input
              {...form.register("phone")}
              type="tel"
              autoComplete="tel"
              className="text-input"
              required
            />
            {form.formState.errors.phone && (
              <small className="field-error">
                {form.formState.errors.phone.message}
              </small>
            )}
          </label>
          <section>
            <h2>
              02 <span>Billing address</span>
            </h2>
            {(["line1", "line2", "city", "state", "postalCode"] as const).map(
              (k) => (
                <label key={k}>
                  {
                    {
                      line1: "Street address",
                      line2: "Apartment / unit (optional)",
                      city: "City",
                      state: "State",
                      postalCode: "ZIP code",
                    }[k]
                  }
                  <input
                    {...form.register(`billingAddress.${k}`)}
                    className="text-input"
                    required={k !== "line2"}
                    autoComplete={`billing ${{ line1: "address-line1", line2: "address-line2", city: "address-level2", state: "address-level1", postalCode: "postal-code" }[k]}`}
                  />
                  {form.formState.errors.billingAddress?.[k] && (
                    <small className="field-error">Check this address field.</small>
                  )}
                </label>
              ),
            )}
            <p className="country-label">United States</p>
          </section>

          <section>
            <h2>
              03 <span>Delivery method</span>
            </h2>
            <div className="delivery-choice-grid">
              <label className={`delivery-choice ${deliveryMethod === "HOME_DELIVERY" ? "selected" : ""}`}>
                <input
                  type="radio"
                  value="HOME_DELIVERY"
                  {...form.register("deliveryMethod")}
                  onChange={(event) => {
                    form.register("deliveryMethod").onChange(event);
                    form.setValue("dealerId", null);
                  }}
                />
                <strong>Home Delivery</strong>
                <span>Delivery to your confirmed destination when vehicle delivery begins.</span>
              </label>
              <label
                className={`delivery-choice ${deliveryMethod === "DEALER_PICKUP" ? "selected" : ""} ${dealers.length ? "" : "disabled"}`}
              >
                <input
                  type="radio"
                  value="DEALER_PICKUP"
                  {...form.register("deliveryMethod")}
                  disabled={!dealers.length}
                />
                <strong>Dealer Pickup</strong>
                <span>
                  {dealers.length
                    ? "Pick up at an active Dyntree dealer that supports vehicle pickup."
                    : "No pickup-enabled Dyntree dealer is currently active."}
                </span>
              </label>
            </div>

            {deliveryMethod === "DEALER_PICKUP" && (
              <div className="dealer-picker">
                <label>
                  Pickup dealer
                  <select
                    className="text-input"
                    {...form.register("dealerId")}
                    required
                  >
                    <option value="">Choose a Dyntree dealer</option>
                    {dealers.map((dealer) => (
                      <option key={dealer.id} value={dealer.id}>
                        {dealer.name} — {dealer.city}, {dealer.state}
                      </option>
                    ))}
                  </select>
                  {form.formState.errors.dealerId && (
                    <small className="field-error">
                      {form.formState.errors.dealerId.message}
                    </small>
                  )}
                </label>
                {selectedDealer && (
                  <div className="selected-dealer-card">
                    <strong>{selectedDealer.name}</strong>
                    <p>
                      {selectedDealer.address}, {selectedDealer.city}, {selectedDealer.state}{" "}
                      {selectedDealer.zip}
                    </p>
                    <small>
                      {[
                        selectedDealer.showroom ? "Showroom" : null,
                        selectedDealer.service ? "Service" : null,
                        selectedDealer.pickup ? "Pickup" : null,
                        selectedDealer.delivery ? "Delivery" : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </small>
                  </div>
                )}
              </div>
            )}
          </section>

          <section>
            <h2>
              04 <span>{deliveryMethod === "DEALER_PICKUP" ? "Contact address" : "Preferred delivery address"}</span>
            </h2>
            <p className="fine-print">
              {deliveryMethod === "DEALER_PICKUP"
                ? "This address remains on your reservation for customer and registration planning. Your selected dealer is stored separately as the pickup location."
                : "Home delivery is planned. Final destination and delivery charges will be confirmed before final vehicle purchase."}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                form.setValue("deliveryAddress", form.getValues("billingAddress"), {
                  shouldValidate: true,
                })
              }
            >
              Use billing address
            </Button>
            {(["line1", "line2", "city", "state", "postalCode"] as const).map(
              (k) => (
                <label key={k}>
                  {
                    {
                      line1: "Street address",
                      line2: "Apartment / unit (optional)",
                      city: "City",
                      state: "State",
                      postalCode: "ZIP code",
                    }[k]
                  }
                  <input
                    {...form.register(`deliveryAddress.${k}`)}
                    className="text-input"
                    required={k !== "line2"}
                    autoComplete={`shipping ${{ line1: "address-line1", line2: "address-line2", city: "address-level2", state: "address-level1", postalCode: "postal-code" }[k]}`}
                  />
                  {form.formState.errors.deliveryAddress?.[k] && (
                    <small className="field-error">Check this address field.</small>
                  )}
                </label>
              ),
            )}
            <p className="country-label">United States</p>
          </section>
          <SubscriptionInfo />
          <section className="agreement-section">
            <h2>
              05 <span>Reservation agreement</span>
            </h2>
            <p>{catalog.settings.language}</p>
            <p>
              {catalog.settings.productionWindow}. No guaranteed delivery date.
              Production specifications, colors, performance targets and final
              pricing may differ.
            </p>
            <Controller
              name="agreement"
              control={form.control}
              render={({ field }) => (
                <label className="agreement-check">
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  <span>
                    I have read and agree to the{" "}
                    <Link href="/reservation-agreement" target="_blank">
                      Reservation Agreement
                    </Link>
                    ,{" "}
                    <Link href="/terms" target="_blank">
                      Terms
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" target="_blank">
                      Privacy Policy
                    </Link>
                    . I understand this is a reservation and does not constitute
                    a vehicle purchase.
                  </span>
                </label>
              )}
            />
            {form.formState.errors.agreement && (
              <p className="field-error">
                {form.formState.errors.agreement.message}
              </p>
            )}
          </section>
          {simulation && (
            <div className="simulation-notice">
              Development payment simulation
              <br />
              <small>
                No card will be charged. This mode is disabled in production.
              </small>
            </div>
          )}
          {!paymentsReady && !simulation && (
            <div className="account-unavailable">
              <strong>Paid reservations are not open yet.</strong>
              <p>
                Save your configuration in My Garage while Dyntree prepares
                checkout.
              </p>
            </div>
          )}
          {error && (
            <div role="alert" className="form-error">
              {error}
            </div>
          )}
          <Button
            className="cta checkout-submit"
            type="submit"
            disabled={
              form.formState.isSubmitting ||
              !catalog.settings.available ||
              (!paymentsReady && !simulation)
            }
          >
            {form.formState.isSubmitting ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <LockKeyhole size={16} />
            )}{" "}
            {simulation
              ? "Simulate reservation"
              : `Continue to pay ${money(catalog.settings.amountCents)}`}
            <ArrowRight size={16} />
          </Button>
          <p className="fine-print">
            Payment information is handled by Stripe. Dyntree does not store raw
            card details.
          </p>
        </form>
        <aside className="checkout-summary">
          <div className="checkout-image">
            <Image
              src={asset.url}
              alt={asset.alt}
              fill
              sizes="(max-width:800px) 100vw, 40vw"
            />
          </div>
          <div>
            <p className="eyebrow">YOUR CONFIGURATION</p>
            <h2>M1E {trim.name}</h2>
            <span>
              {catalog.paints.find((x) => x.slug === configuration.paint)?.name}
            </span>
            <dl>
              {quote.lines.map((l, i) => (
                <div key={i}>
                  <dt>{l.label}</dt>
                  <dd>{l.priceCents ? money(l.priceCents) : "Included"}</dd>
                </div>
              ))}
              <div className="summary-total">
                <dt>Estimated vehicle price</dt>
                <dd>{money(quote.totalCents)}</dd>
              </div>
            </dl>
            <Link
              className="text-link"
              href={`/configure/m1e?${configurationQuery(configuration)}`}
            >
              Edit configuration
            </Link>
            <div className="deposit-summary">
              <span>Due today</span>
              <strong>{money(catalog.settings.amountCents)}</strong>
              <p>
                <Check size={14} />
                {catalog.settings.refundable
                  ? "Refundable reservation"
                  : "Reservation deposit"}
              </p>
            </div>
            <p className="fine-print">
              Taxes, title, registration, destination, and other applicable fees
              are additional. Final vehicle payment and shipping are not
              collected during reservation.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
