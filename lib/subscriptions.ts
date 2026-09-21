import { createHash } from "node:crypto";
import Stripe from "stripe";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getDb } from "./db";
import { stripeClient } from "./payments";
import { HttpError, appOrigin, jsonValue } from "./security";
import {
  defaultSubscriptionSettings,
  subscriptionSettingsSchema,
} from "./subscription-settings";
import {
  addUtcMonths,
  generateLeaseOffer,
  getLeasePurchaseSettings,
  leaseOfferFromJson,
  type GeneratedLeaseOffer,
  type LeaseOfferInput,
} from "./lease-offers";

const objectId = (v: string | { id: string } | null | undefined) =>
  typeof v === "string" ? v : v?.id;

export async function subscriptionSettings() {
  const row = await getDb().siteSetting.findUnique({
    where: { key: "vehicle-subscriptions" },
  });
  return subscriptionSettingsSchema.parse(
    row?.value || defaultSubscriptionSettings,
  );
}

export function assertSubscriptionMode(livemode: boolean) {
  if (livemode !== !!process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_"))
    throw new HttpError(
      409,
      "This billing offer belongs to a different Stripe environment.",
    );
  if (livemode && process.env.ENABLE_VEHICLE_SUBSCRIPTIONS !== "true")
    throw new HttpError(503, "Live vehicle lease billing is not enabled.");
}

export function validateMonthlyPrice(price: Stripe.Price) {
  if (
    !price.active ||
    price.type !== "recurring" ||
    price.currency !== "usd" ||
    !price.unit_amount ||
    price.unit_amount < 50 ||
    price.recurring?.interval !== "month" ||
    price.recurring.interval_count !== 1 ||
    price.recurring.usage_type !== "licensed" ||
    price.billing_scheme !== "per_unit" ||
    price.transform_quantity ||
    price.tax_behavior === "unspecified"
  )
    throw new HttpError(
      400,
      "Use an active, fixed USD monthly Stripe Price with explicit tax behavior.",
    );
  return price.unit_amount;
}

export async function portalConfiguration(stripe: Stripe) {
  const desiredFeatures = () => ({
    payment_method_update: { enabled: true },
    invoice_history: { enabled: true },
    subscription_cancel: {
      enabled: true,
      mode: "at_period_end" as const,
      proration_behavior: "none" as const,
    },
    subscription_update: {
      enabled: false,
      default_allowed_updates: [],
      proration_behavior: "none" as const,
    },
  });

  const isUsable = (c: Stripe.BillingPortal.Configuration) =>
    c.active &&
    c.features.subscription_cancel.enabled &&
    c.features.subscription_cancel.mode === "at_period_end" &&
    c.features.payment_method_update.enabled &&
    c.features.invoice_history.enabled &&
    !c.features.subscription_update.enabled;

  const configuredId = process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID;

  if (configuredId) {
    const configured =
      await stripe.billingPortal.configurations.retrieve(configuredId);

    if (isUsable(configured)) return configured.id;

    if (!configured.active)
      throw new HttpError(
        503,
        "The Stripe Billing Portal configuration in STRIPE_BILLING_PORTAL_CONFIGURATION_ID is inactive.",
      );

    const repaired = await stripe.billingPortal.configurations.update(
      configured.id,
      { features: desiredFeatures() },
    );

    if (!isUsable(repaired))
      throw new HttpError(
        503,
        "Stripe could not configure the Billing Portal for Dyntree lease billing.",
      );

    return repaired.id;
  }

  const configs = await stripe.billingPortal.configurations.list({
    active: true,
    limit: 100,
  });

  const managed = configs.data.find(
    (c) => c.metadata?.dyntreeManaged === "true",
  );

  if (managed) {
    if (isUsable(managed)) return managed.id;

    const repaired = await stripe.billingPortal.configurations.update(
      managed.id,
      { features: desiredFeatures() },
    );

    if (!isUsable(repaired))
      throw new HttpError(
        503,
        "Stripe could not update the Dyntree-managed Billing Portal configuration.",
      );

    return repaired.id;
  }

  const created = await stripe.billingPortal.configurations.create({
    name: "Dyntree vehicle lease billing",
    default_return_url: `${appOrigin()}/account`,
    metadata: {
      dyntreeManaged: "true",
      purpose: "vehicle-lease-billing",
    },
    features: desiredFeatures(),
  });

  if (!isUsable(created))
    throw new HttpError(
      503,
      "Stripe created a Billing Portal configuration, but it does not have the required Dyntree lease-billing features.",
    );

  return created.id;
}

type InvitationOptions = {
  leaseOffer?: GeneratedLeaseOffer;
  replacePending?: boolean;
  generatedByStripeApi?: boolean;
};

async function saveInvitation(
  adminId: string,
  reservationNumber: string,
  price: Stripe.Price,
  options: InvitationOptions = {},
) {
  const db = getDb();
  const settings = await subscriptionSettings();
  if (!settings.enabled)
    throw new HttpError(
      409,
      "Enable vehicle lease billing terms in Site settings first.",
    );

  const r = await db.reservation.findUnique({
    where: { number: reservationNumber },
    include: { snapshot: true, vehicleSubscription: true },
  });
  if (!r || r.paymentStatus !== "PAID")
    throw new HttpError(409, "A paid reservation is required.");

  const userId = r.userId;
  if (!userId)
    throw new HttpError(
      409,
      "Reservation must be assigned to a customer account before a lease offer can be created.",
    );

  const monthlyCents = validateMonthlyPrice(price);
  assertSubscriptionMode(price.livemode);

  if (
    options.leaseOffer &&
    options.leaseOffer.monthlyCents !== monthlyCents
  )
    throw new HttpError(
      409,
      "The generated Stripe Price does not match the calculated lease payment.",
    );

  const existing = r.vehicleSubscription;
  if (existing) {
    if (!options.replacePending)
      throw new HttpError(
        409,
        "This reservation already has a billing invitation.",
      );
    if (existing.stripeSubscriptionId || existing.status !== "INVITED")
      throw new HttpError(
        409,
        "Billing has already started for this reservation and its price can no longer be replaced.",
      );
    if (existing.checkoutSessionId)
      throw new HttpError(
        409,
        "The customer already opened Stripe Checkout for this offer. Let that checkout expire before generating a replacement.",
      );
  }

  const leaseOffer = options.leaseOffer;
  const termsSnapshot = jsonValue({
    ...settings,
    billingType: leaseOffer ? "lease" : "subscription",
    generatedByStripeApi: !!options.generatedByStripeApi,
    configuration: r.snapshot?.configuration,
    priceId: price.id,
    monthlyCents,
    currency: price.currency,
    taxBehavior: price.tax_behavior,
    cadence: "monthly",
    ...(leaseOffer ? { leaseOffer } : {}),
    billingStarts: leaseOffer
      ? `Stripe Checkout collects the calculated amount due at signing, including the first monthly payment, then bills ${monthlyCents} cents monthly for the agreed term.`
      : "First payment at Stripe Checkout; renews monthly until cancelled.",
    cancellation: leaseOffer
      ? `Recurring billing is configured not to extend beyond the ${leaseOffer.termMonths}-month lease term. Early cancellation, mileage, wear, return and other vehicle obligations remain governed by the agreed lease terms.`
      : "Cancel renewal at the end of the current billing period using Manage billing. Vehicle return obligations remain governed by the agreed terms.",
  });

  return db.$transaction(async (tx) => {
    const before = existing ? jsonValue(existing) : Prisma.JsonNull;
    const record = existing
      ? await tx.vehicleSubscription.update({
          where: { id: existing.id },
          data: {
            stripePriceId: price.id,
            monthlyCents,
            currency: price.currency,
            livemode: price.livemode,
            termsVersion: settings.termsVersion,
            termsSnapshot,
            agreementAcceptedAt: null,
            checkoutSessionId: null,
            checkoutAttempt: { increment: 1 },
          },
        })
      : await tx.vehicleSubscription.create({
          data: {
            userId,
            reservationId: r.id,
            stripePriceId: price.id,
            monthlyCents,
            currency: price.currency,
            livemode: price.livemode,
            termsVersion: settings.termsVersion,
            termsSnapshot,
          },
        });

    await tx.adminAuditLog.create({
      data: {
        adminId,
        action: leaseOffer
          ? existing
            ? "lease.offer.regenerated"
            : "lease.offer.generated"
          : "subscription.invited",
        target: `subscription:${record.id}`,
        before,
        after: jsonValue(record),
      },
    });
    return record;
  });
}

// Kept for compatibility with any existing manual-price workflow.
export async function inviteSubscription(
  adminId: string,
  reservationNumber: string,
  priceId: string,
) {
  const db = getDb();
  const r = await db.reservation.findUnique({
    where: { number: reservationNumber },
  });
  if (
    !r ||
    r.paymentStatus !== "PAID" ||
    !["READY_TO_SHIP", "SHIPPED", "DELIVERED"].includes(r.status)
  )
    throw new HttpError(
      409,
      "A paid reservation must be ready to ship, shipped or delivered before manual recurring billing can be invited.",
    );

  const stripe = stripeClient();
  const price = await stripe.prices.retrieve(priceId);
  await portalConfiguration(stripe);
  return saveInvitation(adminId, reservationNumber, price);
}

export async function generateLeaseInvitation(
  adminId: string,
  reservationNumber: string,
  input: LeaseOfferInput,
) {
  const db = getDb();
  const settings = await subscriptionSettings();
  if (!settings.enabled)
    throw new HttpError(
      409,
      "Enable vehicle lease billing terms in Site settings first.",
    );

  const r = await db.reservation.findUnique({
    where: { number: reservationNumber },
    include: { snapshot: true, vehicleSubscription: true },
  });
  if (!r || r.paymentStatus !== "PAID")
    throw new HttpError(409, "A paid reservation is required.");
  if (!r.userId)
    throw new HttpError(
      409,
      "Assign the reservation to a customer account before generating a lease offer.",
    );
  if (!r.snapshot)
    throw new HttpError(409, "Reservation configuration snapshot is missing.");
  if (r.vehicleSubscription?.stripeSubscriptionId)
    throw new HttpError(
      409,
      "Billing has already started for this reservation.",
    );
  if (r.vehicleSubscription?.checkoutSessionId)
    throw new HttpError(
      409,
      "The customer already opened Stripe Checkout for this offer. Let that checkout expire before generating a replacement.",
    );

  const purchaseSettings = await getLeasePurchaseSettings();
  const offer = generateLeaseOffer(
    r.snapshot.estimatedPriceCents,
    input,
    purchaseSettings,
  );

  const configuration =
    r.snapshot.configuration && typeof r.snapshot.configuration === "object"
      ? (r.snapshot.configuration as Record<string, unknown>)
      : {};
  const pricing =
    r.snapshot.pricing && typeof r.snapshot.pricing === "object"
      ? (r.snapshot.pricing as { lines?: unknown })
      : {};
  const lines = Array.isArray(pricing.lines)
    ? (pricing.lines as { label?: unknown; category?: unknown }[])
    : [];
  const vehicleLabel =
    lines.find((line) => line.category === "Vehicle" && line.label)?.label ||
    r.snapshot.vehicleName;
  const trim =
    typeof configuration.trim === "string" ? configuration.trim : "unknown";

  const stripe = stripeClient();
  await portalConfiguration(stripe);

  const { generatedAt: _generatedAt, ...stableOffer } = offer;
  const signature = createHash("sha256")
    .update(
      JSON.stringify({
        reservationId: r.id,
        input,
        offer: stableOffer,
        termsVersion: settings.termsVersion,
        tax: settings.automaticTax,
      }),
    )
    .digest("hex")
    .slice(0, 32);

  const price = await stripe.prices.create(
    {
      currency: "usd",
      unit_amount: offer.monthlyCents,
      recurring: {
        interval: "month",
        interval_count: 1,
        usage_type: "licensed",
      },
      tax_behavior: "exclusive",
      nickname: `${reservationNumber} · ${offer.termMonths}mo · ${offer.annualMiles}mi`,
      product_data: {
        name: `${String(vehicleLabel)} lease · ${reservationNumber}`,
        metadata: {
          dyntreeGeneratedLease: "true",
          reservationId: r.id,
          reservationNumber,
          trim,
          termMonths: String(offer.termMonths),
          annualMiles: String(offer.annualMiles),
        },
      },
      metadata: {
        dyntreeGeneratedLease: "true",
        reservationId: r.id,
        reservationNumber,
        termMonths: String(offer.termMonths),
        annualMiles: String(offer.annualMiles),
        downPercent: String(offer.downPercent),
        dueAtSigningCents: String(offer.dueAtSigningCents),
        residualCents: String(offer.residualCents),
      },
    },
    { idempotencyKey: `dyntree-lease-price:${r.id}:${signature}` },
  );

  validateMonthlyPrice(price);
  assertSubscriptionMode(price.livemode);

  const oldPriceId = r.vehicleSubscription?.stripePriceId;
  const record = await saveInvitation(adminId, reservationNumber, price, {
    leaseOffer: offer,
    replacePending: true,
    generatedByStripeApi: true,
  });

  if (oldPriceId && oldPriceId !== price.id) {
    try {
      const oldPrice = await stripe.prices.retrieve(oldPriceId);
      if (oldPrice.metadata.dyntreeGeneratedLease === "true" && oldPrice.active)
        await stripe.prices.update(oldPriceId, { active: false });
    } catch {
      // The new local offer is valid even if Stripe cannot archive an obsolete
      // generated price. Leaving an old Price active does not change this offer.
    }
  }

  return { record, offer, stripePriceId: price.id };
}

export async function startSubscription(
  userId: string,
  id: string,
  termsVersion: string,
) {
  const db = getDb();
  if (!(await subscriptionSettings()).enabled)
    throw new HttpError(409, "New lease checkout is paused.");

  let record = await db.vehicleSubscription.findFirst({
    where: { id, userId },
    include: { user: true, reservation: true },
  });
  if (!record) throw new HttpError(404, "Lease invitation not found.");
  assertSubscriptionMode(record.livemode);
  if (record.termsVersion !== termsVersion)
    throw new HttpError(409, "Review the lease terms again.");
  if (
    record.reservation.paymentStatus !== "PAID" ||
    !["READY_TO_SHIP", "SHIPPED", "DELIVERED"].includes(
      record.reservation.status,
    )
  )
    throw new HttpError(
      409,
      "This vehicle is not ready for lease checkout yet.",
    );
  if (record.stripeSubscriptionId || record.status !== "INVITED")
    throw new HttpError(
      409,
      "Billing already exists. Open Manage billing instead.",
    );

  const stripe = stripeClient();
  await portalConfiguration(stripe);
  const price = await stripe.prices.retrieve(record.stripePriceId);
  if (
    validateMonthlyPrice(price) !== record.monthlyCents ||
    price.livemode !== record.livemode
  )
    throw new HttpError(
      409,
      "The Stripe monthly price no longer matches this invitation.",
    );

  if (record.checkoutSessionId) {
    const session = await stripe.checkout.sessions.retrieve(
      record.checkoutSessionId,
    );
    if (session.status === "open" && session.url) return { url: session.url };
    if (session.status === "complete")
      return { url: "/account?subscription=pending" };
    const changed = await db.vehicleSubscription.updateMany({
      where: {
        id,
        checkoutSessionId: record.checkoutSessionId,
        stripeSubscriptionId: null,
      },
      data: { checkoutSessionId: null, checkoutAttempt: { increment: 1 } },
    });
    if (!changed.count)
      throw new HttpError(409, "Checkout is already updating. Please retry.");
    record = await db.vehicleSubscription.findUniqueOrThrow({
      where: { id },
      include: { user: true, reservation: true },
    });
  }

  if (!record.stripeCustomerId) {
    const customer = await stripe.customers.create(
      { email: record.user.email, metadata: { dyntreeBillingId: id, userId } },
      { idempotencyKey: `vehicle-customer:${id}` },
    );
    record = await db.vehicleSubscription.update({
      where: { id },
      data: { stripeCustomerId: customer.id },
      include: { user: true, reservation: true },
    });
  }

  const terms = record.termsSnapshot as {
    automaticTax: boolean;
    billingType?: string;
    leaseOffer?: unknown;
  };
  const leaseOffer = leaseOfferFromJson(terms.leaseOffer);

  await db.vehicleSubscription.update({
    where: { id },
    data: { agreementAcceptedAt: new Date() },
  });

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    { price: record.stripePriceId, quantity: 1 },
  ];
  if (leaseOffer?.upfrontCents) {
    lineItems.unshift({
      price_data: {
        currency: record.currency,
        unit_amount: leaseOffer.upfrontCents,
        product_data: {
          name: `Dyntree lease signing amount · ${record.reservation.number || "M1E"}`,
          description:
            "Capitalized cost reduction and acquisition fee. The first monthly payment is billed separately on the same initial Stripe invoice.",
        },
      },
      quantity: 1,
    });
  }

  const session = await stripe.checkout.sessions.create(
    {
      mode: "subscription",
      customer: record.stripeCustomerId!,
      client_reference_id: id,
      line_items: lineItems,
      payment_method_types: ["card"],
      subscription_data: {
        metadata: {
          dyntreeBillingId: id,
          userId,
          ...(leaseOffer
            ? {
                dyntreeBillingType: "lease",
                leaseTermMonths: String(leaseOffer.termMonths),
                annualMiles: String(leaseOffer.annualMiles),
              }
            : {}),
        },
      },
      metadata: {
        dyntreeBillingId: id,
        userId,
        ...(leaseOffer ? { dyntreeBillingType: "lease" } : {}),
      },
      automatic_tax: { enabled: terms.automaticTax },
      billing_address_collection: "required",
      customer_update: { address: "auto" },
      submit_type: "subscribe",
      success_url: `${appOrigin()}/account?subscription=success`,
      cancel_url: `${appOrigin()}/account?subscription=cancelled`,
    },
    { idempotencyKey: `vehicle-checkout:${id}:${record.checkoutAttempt}` },
  );
  await db.vehicleSubscription.update({
    where: { id },
    data: { checkoutSessionId: session.id },
  });
  return { url: session.url };
}

export async function subscriptionPortal(userId: string, id: string) {
  const r = await getDb().vehicleSubscription.findFirst({
    where: { id, userId },
  });
  if (!r?.stripeCustomerId || !r.stripeSubscriptionId)
    throw new HttpError(404, "Active billing record not found.");
  // Cancellation/payment management remains available when new signups are paused.
  if (r.livemode !== !!process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_"))
    throw new HttpError(409, "Stripe environment mismatch.");
  const stripe = stripeClient();
  const configuration = await portalConfiguration(stripe);
  return stripe.billingPortal.sessions.create({
    customer: r.stripeCustomerId,
    configuration,
    return_url: `${appOrigin()}/account`,
  });
}

export async function handleSubscriptionEvent(
  event: Stripe.Event,
): Promise<{ received: boolean; duplicate?: boolean } | null> {
  const obj = event.data.object;
  let subscriptionId: string | undefined;
  let invoiceId: string | undefined;

  if (
    event.type === "checkout.session.completed" &&
    (obj as Stripe.Checkout.Session).mode === "subscription"
  )
    subscriptionId = objectId((obj as Stripe.Checkout.Session).subscription);
  else if (event.type.startsWith("customer.subscription."))
    subscriptionId = (obj as Stripe.Subscription).id;
  else if (
    [
      "invoice.paid",
      "invoice.payment_failed",
      "invoice.payment_action_required",
      "invoice.updated",
    ].includes(event.type)
  ) {
    const invoice = obj as Stripe.Invoice;
    subscriptionId = objectId(
      invoice.parent?.subscription_details?.subscription,
    );
    invoiceId = invoice.id;
  } else return null;

  if (!subscriptionId) return { received: true };
  const db = getDb();
  if (
    await db.webhookEvent.findUnique({ where: { providerEventId: event.id } })
  )
    return { received: true, duplicate: true };

  const stripe = stripeClient();
  const candidate = await stripe.subscriptions.retrieve(subscriptionId);
  const localId = candidate.metadata.dyntreeBillingId;
  if (!z.string().uuid().safeParse(localId).success) return { received: true };

  try {
    return await db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM "VehicleSubscription" WHERE id=${localId}::uuid FOR UPDATE`;
        const r = await tx.vehicleSubscription.findUnique({
          where: { id: localId },
        });
        if (!r) throw Error("Billing invitation missing");

        // Fetch current Stripe state under the row lock; stale and out-of-order
        // events cannot overwrite a later cancellation or already-paid invoice.
        let sub = await stripe.subscriptions.retrieve(subscriptionId!, {
          expand: ["latest_invoice"],
        });
        if (
          objectId(sub.customer) !== r.stripeCustomerId ||
          sub.metadata.userId !== r.userId ||
          sub.livemode !== r.livemode ||
          event.livemode !== r.livemode ||
          (r.stripeSubscriptionId && r.stripeSubscriptionId !== sub.id)
        )
          throw Error("Subscription identity mismatch");

        const leaseOffer = leaseOfferFromJson(
          (r.termsSnapshot as { leaseOffer?: unknown }).leaseOffer,
        );
        if (
          leaseOffer &&
          sub.status !== "canceled" &&
          !sub.cancel_at_period_end
        ) {
          const contractualEnd = addUtcMonths(
            sub.start_date,
            leaseOffer.termMonths,
          );
          // Never extend an earlier customer-requested cancellation. Only add
          // the fixed term when absent, or shorten a later end date to it.
          if (!sub.cancel_at || sub.cancel_at > contractualEnd) {
            sub = await stripe.subscriptions.update(sub.id, {
              cancel_at: contractualEnd,
              proration_behavior: "none",
            });
          }
        }

        const item = sub.items.data[0];
        if (
          sub.items.data.length !== 1 ||
          item.price.id !== r.stripePriceId ||
          item.quantity !== 1
        )
          throw Error("Subscription price mismatch");

        await tx.webhookEvent.create({
          data: { providerEventId: event.id, type: event.type },
        });
        await tx.vehicleSubscription.update({
          where: { id: r.id },
          data: {
            stripeSubscriptionId: sub.id,
            status: sub.status.toUpperCase(),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            currentPeriodEnd: new Date(item.current_period_end * 1000),
            lastSyncedAt: new Date(),
          },
        });

        const invoice = invoiceId
          ? await stripe.invoices.retrieve(invoiceId)
          : typeof sub.latest_invoice === "object"
            ? sub.latest_invoice
            : null;
        if (invoice) {
          if (
            objectId(invoice.parent?.subscription_details?.subscription) !==
              sub.id ||
            objectId(invoice.customer) !== r.stripeCustomerId ||
            invoice.currency !== r.currency
          )
            throw Error("Invoice identity mismatch");
          const data = {
            status: invoice.status || "draft",
            amountDueCents: invoice.amount_due,
            amountPaidCents: invoice.amount_paid,
            currency: invoice.currency,
          };
          await tx.subscriptionInvoice.upsert({
            where: { stripeInvoiceId: invoice.id },
            create: {
              ...data,
              stripeInvoiceId: invoice.id,
              vehicleSubscriptionId: r.id,
            },
            update: data,
          });
        }
        return { received: true };
      },
      { timeout: 30000 },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      (await db.webhookEvent.findUnique({
        where: { providerEventId: event.id },
      }))
    )
      return { received: true, duplicate: true };
    throw error;
  }
}
