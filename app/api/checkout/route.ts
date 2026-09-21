import { estimatePurchase } from "@/lib/purchase-planning";
import { scheduleEmailDelivery } from "@/lib/email-delivery";
import { isDeepStrictEqual } from "node:util";
import { requireUser } from "@/lib/auth";
import { getCatalog } from "@/lib/catalog";
import { getDb } from "@/lib/db";
import {
  configurationQuery,
  priceConfiguration,
  validateConfiguration,
} from "@/lib/configuration";
import { stripeClient, simulateReservation } from "@/lib/payments";
import { checkoutSchema } from "@/lib/validation";
import {
  appOrigin,
  assertSameOrigin,
  errorResponse,
  HttpError,
  rateLimit,
  jsonValue,
  localSimulationEnabled,
} from "@/lib/security";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    await rateLimit(request, "checkout", user.id, 10);
    const input = checkoutSchema.parse(await request.json());
    if (input.email.toLowerCase() !== user.email)
      throw new HttpError(
        400,
        "Use the verified email address on your account.",
      );
    const db = getDb();
    const selectedDealer =
      input.deliveryMethod === "DEALER_PICKUP"
        ? await db.dealer.findFirst({
            where: {
              id: input.dealerId || undefined,
              active: true,
              pickup: true,
            },
          })
        : null;
    if (input.deliveryMethod === "DEALER_PICKUP" && !selectedDealer)
      throw new HttpError(
        409,
        "That dealer is not currently available for vehicle pickup. Choose another active dealer.",
      );
    const catalog = await getCatalog();
    if (!catalog.settings.available)
      throw new HttpError(409, "Reservations are currently paused.");
    if (input.agreementVersion !== catalog.settings.agreementVersion)
      throw new HttpError(
        409,
        "Reservation terms have changed. Reload and review the updated agreement.",
      );
    let configuration;
    try {
      configuration = validateConfiguration(catalog, input.configuration);
    } catch (e) {
      throw new HttpError(
        400,
        e instanceof Error ? e.message : "Invalid configuration.",
      );
    }
    const pricing = priceConfiguration(catalog, configuration);
    const simulation = localSimulationEnabled();
    if (!simulation) stripeClient();
    const idempotencyKey = `${user.id}:${input.idempotencyKey}`;
    let reservation = await db.reservation.findUnique({
      where: { idempotencyKey },
    });
    if (!reservation) {
      reservation = await db.reservation.create({
        data: {
          userId: user.id,
          paymentProvider: simulation ? "simulation" : "stripe",
          paymentEnvironment: simulation
            ? "development"
            : process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_")
              ? "live"
              : "test",
          idempotencyKey,
          depositCents: catalog.settings.amountCents,
          refundable: catalog.settings.refundable,
          customer: jsonValue({
            firstName: input.firstName,
            lastName: input.lastName,
            email: user.email,
            phone: input.phone,
          }),
          billingAddress: jsonValue(input.billingAddress),
          deliveryAddress: jsonValue(input.deliveryAddress),
          deliveryMethod: input.deliveryMethod,
          dealerId: selectedDealer?.id || null,
          agreementVersion: input.agreementVersion,
          agreementAcceptedAt: new Date(),
          snapshot: {
            create: {
              configuration: jsonValue(configuration),
              pricing: jsonValue({
                ...pricing,
                purchaseEstimate: estimatePurchase(
                  pricing.totalCents,
                  configuration.purchasePreference || { method: "cash" },
                  catalog.purchaseSettings,
                ),
              }),
              vehicleName: "Dyntree M1E",
              estimatedPriceCents: pricing.totalCents,
              terms: jsonValue(catalog.settings),
            },
          },
        },
      });
    } else {
      const snapshot = await db.reservationConfigurationSnapshot.findUnique({
        where: { reservationId: reservation.id },
      });
      if (
        !snapshot ||
        !isDeepStrictEqual(snapshot.configuration, jsonValue(configuration))
      )
        throw new HttpError(
          409,
          "This checkout token belongs to another configuration. Refresh to continue.",
        );
      if (
        reservation.deliveryMethod !== input.deliveryMethod ||
        (reservation.dealerId || null) !== (selectedDealer?.id || null)
      )
        throw new HttpError(
          409,
          "This checkout token belongs to another delivery selection. Refresh to continue.",
        );
    }
    if (reservation.paymentStatus === "PAID")
      return Response.json({
        url: `/account?reservation=${reservation.number}`,
      });
    if (simulation) {
      const confirmed = await simulateReservation(reservation.id);
      scheduleEmailDelivery();
      return Response.json({
        url: `/account?reservation=${confirmed.number}`,
        simulated: true,
      });
    }
    if (
      reservation.paymentStatus !== "PENDING" ||
      reservation.paymentProvider !== "stripe"
    )
      throw new HttpError(
        409,
        "Start a new Stripe reservation checkout to continue.",
      );
    const stripe = stripeClient();
    if (reservation.legacyCheckoutSessionId) {
      const existing = await stripe.checkout.sessions.retrieve(
        reservation.legacyCheckoutSessionId,
      );
      if (existing.status === "open" && existing.url)
        return Response.json({ url: existing.url });
      if (existing.status === "complete")
        return Response.json({ url: `/account?checkout=pending` });
      throw new HttpError(
        409,
        "This checkout expired. Refresh the page to start a new reservation.",
      );
    }
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        customer_email: user.email,
        client_reference_id: reservation.id,
        metadata: { reservationId: reservation.id, userId: user.id },
        payment_intent_data: {
          metadata: { reservationId: reservation.id, userId: user.id },
        },
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: reservation.depositCents,
              product_data: {
                name: `Dyntree M1E ${catalog.trims.find((x) => x.slug === configuration.trim)?.name} reservation`,
                description:
                  "Reservation only. Not a final vehicle purchase agreement.",
              },
            },
            quantity: 1,
          },
        ],
        success_url: `${appOrigin()}/account?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appOrigin()}/reserve?${configurationQuery(configuration)}&cancelled=1`,
        // Use Stripe's default expiry so retries with this idempotency key
        // keep identical parameters and avoid its minimum-expiry boundary.
      },
      { idempotencyKey: `checkout:${reservation.id}` },
    );
    await db.reservation.update({
      where: { id: reservation.id },
      data: { legacyCheckoutSessionId: session.id },
    });
    return Response.json({ url: session.url });
  } catch (e) {
    return errorResponse(e);
  }
}
