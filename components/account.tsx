"use client";
import { SubscriptionAccount } from "./subscription-account";
import { PurchaseEstimateSummary } from "./purchase-planner";
import {
  purchasePreferenceLabel,
  type PurchaseEstimate,
} from "@/lib/purchase-planning";
import { apiResult } from "@/lib/client-api";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { SignInButton, SignUpButton, SignOutButton } from "@clerk/nextjs";
import {
  ArrowUpRight,
  Bookmark,
  Plus,
  LogOut,
  ShieldCheck,
  Check,
  Loader2,
  Trash2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { money, configurationQuery } from "@/lib/configuration";
import { resolveVehicleImage } from "@/lib/image-resolver";
import type { Catalog, Configuration, DealerSummary } from "@/lib/types";
import { statuses } from "@/lib/admin-resources";
import { safeReturnTo } from "@/lib/paths";
export type AccountUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  deliveryAddress: Address | null;
  billingAddress: Address | null;
};
export type Address = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: "US";
};
export type AccountReservation = {
  id: string;
  number: string;
  status: string;
  paymentStatus: string;
  depositCents: number;
  refundable: boolean;
  simulated: boolean;
  complimentary: boolean;
  reservedForName: string | null;
  amountDue: number;
  amountPaid: number;
  deliveryMethod: string;
  dealerId: string | null;
  dealer: DealerSummary | null;
  createdAt: string;
  snapshot: {
    configuration: Configuration;
    estimatedPriceCents: number;
    pricing?: { purchaseEstimate?: PurchaseEstimate };
  };
  history: { id: string; status: string; note: string; createdAt: string }[];
  payments: {
    id: string;
    amountCents: number;
    status: string;
    createdAt: string;
  }[];
  refunds: {
    id: string;
    amountCents: number;
    status: string;
    reason: string;
    createdAt: string;
  }[];
};
export type AccountData = {
  user: AccountUser;
  configurations: {
    id: string;
    name: string;
    code: string;
    configuration: Configuration;
    estimatedPriceCents: number;
    createdAt: string;
  }[];
  reservations: AccountReservation[];
  dealers: DealerSummary[];
};
export function AccountSignIn({
  dev,
  clerk,
  returnTo = "/account",
}: {
  dev: boolean;
  clerk: boolean;
  returnTo?: string;
}) {
  const [busy, setBusy] = useState("");
  async function login(role: string) {
    setBusy(role);
    try {
      const response = await fetch("/api/auth/dev", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const result = await apiResult(response);
      if (!response.ok) throw Error(result.error);
      window.location.assign(safeReturnTo(returnTo));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sign in failed.");
      setBusy("");
    }
  }
  return (
    <div className="account-signin">
      <div className="signin-image">
        <Image
          src="/cars/m1e/hero/front-3q.webp"
          alt="M1E development prototype"
          fill
          sizes="50vw"
        />
      </div>
      <div className="signin-copy">
        <p className="eyebrow">MY DYNTREE</p>
        <h1>
          A place for
          <br />
          what&apos;s next.
        </h1>
        <p>
          Save the M1E that feels like you. Manage your reservation. Follow
          every step of the journey.
        </p>
        {clerk ? (
          <div className="signin-actions">
            <SignInButton
              mode="modal"
              forceRedirectUrl={safeReturnTo(returnTo)}
            >
              <Button className="cta">
                Sign in <ArrowUpRight size={16} />
              </Button>
            </SignInButton>
            <SignUpButton
              mode="modal"
              forceRedirectUrl={safeReturnTo(returnTo)}
            >
              <Button variant="outline" className="cta">
                Create an account
              </Button>
            </SignUpButton>
          </div>
        ) : dev ? (
          <div className="dev-auth">
            <strong>Development accounts</strong>
            <p>
              Local testing only. These profiles cannot sign in to a production
              deployment.
            </p>
            <Button onClick={() => login("customer")} disabled={!!busy}>
              {busy === "customer" ? (
                <Loader2 className="animate-spin" size={16} />
              ) : null}{" "}
              Continue as customer
            </Button>
            <Button
              variant="outline"
              onClick={() => login("admin")}
              disabled={!!busy}
            >
              Continue as administrator
            </Button>
            <small>customer@example.com · admin@example.com</small>
          </div>
        ) : (
          <div className="account-unavailable">
            <strong>Accounts are opening soon.</strong>
            <p>
              Explore and share your configuration now. Account sign-in will
              become available when Dyntree opens customer registration.
            </p>
            <Button asChild variant="outline">
              <Link href="/configure/m1e">Configure M1E</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
export function OrderTimeline({
  reservation,
}: {
  reservation: AccountReservation;
}) {
  const current = statuses.indexOf(reservation.status);
  return (
    <div className="order-timeline">
      {statuses
        .filter((x) => x !== "CANCELLED")
        .map((status, i) => {
          const history = reservation.history.find((x) => x.status === status);
          return (
            <div
              key={status}
              className={`${history ? "done" : ""} ${status === reservation.status ? "current" : ""}`}
            >
              <span className="timeline-node">
                {history ? <Check size={12} /> : null}
              </span>
              <div>
                <strong>
                  {status
                    .toLowerCase()
                    .replaceAll("_", " ")
                    .replace(/^./, (c) => c.toUpperCase())}
                </strong>
                {history ? (
                  <small>
                    {new Date(history.createdAt).toLocaleDateString("en-US")} ·{" "}
                    {history.note}
                  </small>
                ) : i > current ? (
                  <small>Timing to be confirmed</small>
                ) : null}
              </div>
            </div>
          );
        })}
      {reservation.status === "CANCELLED" && (
        <p className="cancelled-status">This reservation is cancelled.</p>
      )}
    </div>
  );
}
export function AccountPortal({
  initial,
  catalog,
  dev,
  subscriptionRequested = false,
}: {
  initial: AccountData;
  catalog: Catalog;
  dev: boolean;
  subscriptionRequested?: boolean;
}) {
  const [data, setData] = useState(initial);
  const [tab, setTab] = useState(
    subscriptionRequested ? "subscriptions" : "garage",
  );
  const [openReservation, setOpenReservation] = useState("");
  async function refresh() {
    const response = await fetch("/api/account");
    if (response.ok) setData((await response.json()) as AccountData);
  }
  async function remove(id: string) {
    const response = await fetch("/api/configurations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (response.ok) {
      await refresh();
      toast.success("Configuration removed.");
    } else toast.error("Could not remove configuration.");
  }
  async function cancel(id: string) {
    const response = await fetch(`/api/reservations/${id}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: true }),
    });
    const result = await apiResult(response);
    if (response.ok) {
      await refresh();
      toast.success(result.message);
    } else toast.error(result.error);
  }
  const u = data.user;

  function deliveryLabel(reservation: AccountReservation) {
    if (reservation.deliveryMethod === "DEALER_PICKUP") {
      return reservation.dealer
        ? `Dealer pickup · ${reservation.dealer.name}`
        : "Dealer pickup planned";
    }
    return "Home delivery planned";
  }
  return (
    <main id="main" className="page-content account-page">
      <div className="account-heading">
        <div>
          <p className="eyebrow">MY DYNTREE</p>
          <h1>Hello, {u.firstName || "driver"}.</h1>
          <p>Your next chapter starts here.</p>
        </div>
        <div>
          {u.role === "ADMIN" && (
            <Button asChild variant="outline">
              <Link href="/admin">
                <ShieldCheck size={15} />
                Administration
              </Link>
            </Button>
          )}
          {dev ? (
            <Button
              variant="ghost"
              onClick={async () => {
                await fetch("/api/auth/dev", { method: "DELETE" });
                window.location.reload();
              }}
            >
              <LogOut size={15} />
              Sign out
            </Button>
          ) : (
            <SignOutButton>
              <Button variant="ghost">
                <LogOut size={15} />
                Sign out
              </Button>
            </SignOutButton>
          )}
        </div>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="account-tabs">
          {[
            ["garage", "My Garage"],
            ["reservations", "Reservations"],
            ["subscriptions", "Subscriptions"],
            ["profile", "Profile"],
            ["delivery", "Delivery information"],
            ["payments", "Payment history"],
          ].map(([id, label]) => (
            <TabsTrigger key={id} value={id}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="subscriptions">
          <SubscriptionAccount />
        </TabsContent>
        <TabsContent value="garage">
          <div className="garage-heading">
            <h2>Built around you.</h2>
            <Button asChild variant="outline">
              <Link href="/configure/m1e">
                <Plus size={16} /> New configuration
              </Link>
            </Button>
          </div>
          <div className="garage-grid">
            {data.configurations.map((saved) => {
              const asset = resolveVehicleImage(
                catalog.images,
                saved.configuration,
              ).image;
              return (
                <article key={saved.id} className="garage-card">
                  <div className="garage-image">
                    <Image
                      src={asset.url}
                      alt={asset.alt}
                      fill
                      sizes="(max-width: 700px) 100vw, 40vw"
                    />
                  </div>
                  <div>
                    <small>{saved.code}</small>
                    <h3>{saved.name}</h3>
                    <p>
                      {
                        catalog.paints.find(
                          (x) => x.slug === saved.configuration.paint,
                        )?.name
                      }{" "}
                      ·{" "}
                      {
                        catalog.interiors.find(
                          (x) => x.slug === saved.configuration.interior,
                        )?.name
                      }{" "}
                      interior
                    </p>
                    <span>
                      {money(saved.estimatedPriceCents)}{" "}
                      <small>Estimate when saved</small>
                    </span>
                    <p className="fine-print">
                      {purchasePreferenceLabel(
                        saved.configuration.purchasePreference,
                      )}
                    </p>
                    <div className="garage-actions">
                      <Button asChild variant="outline">
                        <Link
                          href={`/configure/m1e?${configurationQuery(saved.configuration)}`}
                        >
                          View configuration <ArrowUpRight size={15} />
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Remove ${saved.name}`}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogTitle>
                            Remove this saved configuration?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Your reservations will remain in your account.
                          </AlertDialogDescription>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep it</AlertDialogCancel>
                            <AlertDialogAction onClick={() => remove(saved.id)}>
                              Remove configuration
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </article>
              );
            })}
            {!data.configurations.length && (
              <div className="empty-state">
                <Bookmark size={28} />
                <h3>Your M1E belongs here.</h3>
                <p>
                  Build your first configuration and save it to your garage.
                </p>
                <Button asChild>
                  <Link href="/configure/m1e">
                    Configure M1E <ArrowUpRight size={16} />
                  </Link>
                </Button>
              </div>
            )}
          </div>
          <p className="fine-print">
            Saved estimates reflect the catalog at the time of saving. Open a
            build to see current pricing.
          </p>
        </TabsContent>
        <TabsContent value="reservations">
          <div className="garage-heading">
            <h2>Your journey.</h2>
            <Button variant="outline" onClick={refresh}>
              Refresh status
            </Button>
          </div>
          {!data.reservations.length ? (
            <div className="empty-state">
              <h3>A new beginning is ahead.</h3>
              <p>
                No paid reservations yet. A Stripe checkout can take a moment to
                appear after its verified payment confirmation.
              </p>
              <Button asChild>
                <Link href="/configure/m1e">Find your M1E</Link>
              </Button>
            </div>
          ) : (
            data.reservations.map((r) => (
              <article key={r.id} className="reservation-card">
                <div className="reservation-heading">
                  <div>
                    <span className="status-badge">
                      {r.status.replaceAll("_", " ")}
                    </span>
                    <h3>{r.number}</h3>
                    {r.reservedForName && (
                      <p className="reservation-for">
                        Reserved for {r.reservedForName}
                      </p>
                    )}
                    <p>
                      {new Date(r.createdAt).toLocaleDateString("en-US")} ·{" "}
                      {deliveryLabel(r)}
                    </p>
                  </div>
                  <div>
                    <strong>
                      {r.complimentary ? "Complimentary" : money(r.depositCents)}
                    </strong>
                    <p>
                      {r.paymentStatus.replaceAll("_", " ")}
                      {r.complimentary ? " · $0 collected" : ""}
                    </p>
                  </div>
                </div>
                {r.simulated && (
                  <div className="simulation-notice">
                    Development payment simulation · No funds collected
                  </div>
                )}
                <div className="reservation-summary">
                  <span>M1E {r.snapshot.configuration.trim}</span>
                  <p>
                    {purchasePreferenceLabel(
                      r.snapshot.configuration.purchasePreference,
                    )}
                  </p>
                  {r.snapshot.pricing?.purchaseEstimate && (
                    <details className="purchase-details">
                      <summary>Planning estimate saved at reservation</summary>
                      <PurchaseEstimateSummary
                        estimate={r.snapshot.pricing.purchaseEstimate}
                      />
                      <p className="fine-print">
                        {r.snapshot.pricing.purchaseEstimate.disclosure}
                      </p>
                    </details>
                  )}
                  <span>
                    Vehicle estimate at reservation:{" "}
                    {money(r.snapshot.estimatedPriceCents)}
                  </span>
                </div>
                {r.deliveryMethod === "DEALER_PICKUP" && r.dealer && (
                  <div className="reservation-delivery-detail">
                    <div>
                      <span className="status-badge">DEALER PICKUP</span>
                      <strong>{r.dealer.name}</strong>
                    </div>
                    <p>
                      {r.dealer.address}, {r.dealer.city}, {r.dealer.state}{" "}
                      {r.dealer.zip}
                    </p>
                  </div>
                )}
                <p className="fine-print">
                  Final destination and delivery charges will be confirmed
                  before final vehicle purchase.
                </p>
                <div className="reservation-actions">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setOpenReservation(openReservation === r.id ? "" : r.id)
                    }
                  >
                    {openReservation === r.id
                      ? "Hide timeline"
                      : "View reservation timeline"}
                  </Button>
                  {[
                    "RESERVED",
                    "CONFIGURATION_SAVED",
                    "AWAITING_PRODUCTION",
                  ].includes(r.status) && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost">Cancel reservation</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogTitle>Cancel {r.number}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This ends your reservation. Any eligible refund is
                          processed separately by Dyntree and appears in your
                          payment history.
                        </AlertDialogDescription>
                        <AlertDialogFooter>
                          <AlertDialogCancel>
                            Keep reservation
                          </AlertDialogCancel>
                          <AlertDialogAction onClick={() => cancel(r.id)}>
                            Confirm cancellation
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
                {openReservation === r.id && <OrderTimeline reservation={r} />}
              </article>
            ))
          )}
        </TabsContent>
        <TabsContent value="profile">
          <ProfileForm user={u} onSave={refresh} />
        </TabsContent>
        <TabsContent value="delivery">
          <DeliveryPanel
            user={u}
            dealers={data.dealers}
            onSave={refresh}
          />
        </TabsContent>
        <TabsContent value="payments">
          <div className="garage-heading">
            <h2>Payment history.</h2>
          </div>
          {!data.reservations.length ? (
            <div className="empty-state">
              <p>No payments to display.</p>
            </div>
          ) : (
            <div className="comparison-scroll">
              <table className="account-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Reservation</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.reservations.flatMap((r) => [
                    ...(r.complimentary
                      ? [
                          <tr key={`complimentary-${r.id}`}>
                            <td>
                              {new Date(r.createdAt).toLocaleDateString("en-US")}
                            </td>
                            <td>{r.number}</td>
                            <td>Complimentary reservation</td>
                            <td>{money(0)}</td>
                            <td>PAID</td>
                          </tr>,
                        ]
                      : []),
                    ...r.payments.map((p) => (
                      <tr key={p.id}>
                        <td>
                          {new Date(p.createdAt).toLocaleDateString("en-US")}
                        </td>
                        <td>{r.number}</td>
                        <td>{r.simulated ? "Simulated deposit" : "Deposit"}</td>
                        <td>{money(p.amountCents)}</td>
                        <td>{p.status}</td>
                      </tr>
                    )),
                    ...r.refunds.map((f) => (
                      <tr key={f.id}>
                        <td>
                          {new Date(f.createdAt).toLocaleDateString("en-US")}
                        </td>
                        <td>{r.number}</td>
                        <td>Refund</td>
                        <td>−{money(f.amountCents)}</td>
                        <td>{f.status}</td>
                      </tr>
                    )),
                  ])}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
}
function ProfileForm({
  user,
  onSave,
  delivery = false,
}: {
  user: AccountUser;
  onSave: () => Promise<void>;
  delivery?: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      deliveryAddress: user.deliveryAddress || {
        line1: "",
        line2: "",
        city: "",
        state: "",
        postalCode: "",
        country: "US" as const,
      },
    },
  });
  return (
    <form
      className="profile-form"
      onSubmit={handleSubmit(async (values) => {
        const body = {
          firstName: values.firstName,
          lastName: values.lastName,
          phone: values.phone,
          ...(delivery ? { deliveryAddress: values.deliveryAddress } : {}),
        };
        const r = await fetch("/api/account", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const result = await apiResult(r);
        if (r.ok) {
          toast.success("Account information saved.");
          await onSave();
        } else toast.error(result.error);
      })}
    >
      <h2>{delivery ? "Where your journey begins." : "Your details."}</h2>
      {delivery ? (
        <>
          <p>
            Keep this address current for home delivery, registration planning,
            and reservation contact information.
          </p>
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
                  className="text-input"
                  {...register(`deliveryAddress.${k}`)}
                  required={k !== "line2"}
                />
              </label>
            ),
          )}
          <input
            type="hidden"
            {...register("deliveryAddress.country")}
            value="US"
          />
        </>
      ) : (
        <>
          <div className="form-row">
            <label>
              First name
              <input
                {...register("firstName")}
                required
                className="text-input"
              />
            </label>
            <label>
              Last name
              <input
                {...register("lastName")}
                required
                className="text-input"
              />
            </label>
          </div>
          <label>
            Email
            <input readOnly value={user.email} className="text-input" />
          </label>
          <label>
            Phone
            <input type="tel" {...register("phone")} className="text-input" />
          </label>
        </>
      )}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : null}
        Save changes
      </Button>
    </form>
  );
}

function DeliveryPanel({
  user,
  dealers,
  onSave,
}: {
  user: AccountUser;
  dealers: DealerSummary[];
  onSave: () => Promise<void>;
}) {
  return (
    <div className="delivery-panel">
      <ProfileForm user={user} onSave={onSave} delivery />
      <section className="account-dealers">
        <div className="garage-heading">
          <div>
            <p className="eyebrow">DYNTREE DEALERS</p>
            <h2>Pickup locations.</h2>
          </div>
          <Button asChild variant="outline">
            <Link href="/dealers">View all dealers</Link>
          </Button>
        </div>
        {dealers.length ? (
          <div className="account-dealer-grid">
            {dealers.map((dealer) => (
              <article key={dealer.id} className="account-dealer-card">
                <div>
                  <span className="status-badge">ACTIVE</span>
                  <h3>{dealer.name}</h3>
                  <p>
                    {dealer.address}<br />
                    {dealer.city}, {dealer.state} {dealer.zip}
                  </p>
                </div>
                <small>
                  {[
                    dealer.showroom ? "Showroom" : null,
                    dealer.service ? "Service" : null,
                    dealer.pickup ? "Pickup" : null,
                    dealer.delivery ? "Delivery" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </small>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No active Dyntree dealer locations are listed yet.</p>
          </div>
        )}
      </section>
    </div>
  );
}
