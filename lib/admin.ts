import { subscriptionSettingsSchema } from "./subscription-settings";
import { purchaseSettingsSchema } from "./purchase-planning";
import { z } from "zod";
import { Prisma, OrderStatus } from "@prisma/client";
import { getDb } from "./db";
import { requireAdmin } from "./auth";
import { HttpError, jsonValue } from "./security";
import { statuses } from "./admin-resources";
const slug = z
  .string()
  .regex(/^[a-z0-9-]+$/)
  .max(60);
const text = z.string().trim().max(300);
const price = z.number().int().min(0).max(100000000);
const nullableText = text.nullable().optional();
const imageUrl = z
  .string()
  .max(1000)
  .refine((v) => {
    if (/^\/(?!\/)[a-zA-Z0-9_./-]+$/.test(v) && !v.includes("..")) return true;
    try {
      const url = new URL(v);
      return (
        url.protocol === "https:" &&
        !!process.env.IMAGE_CDN_HOST &&
        url.hostname === process.env.IMAGE_CDN_HOST &&
        !url.username &&
        !url.password
      );
    } catch {
      return false;
    }
  }, "Use a local public path or the HTTPS image host configured by IMAGE_CDN_HOST.");
const option = z
  .object({
    slug,
    name: text.min(1),
    description: z.string().max(3000),
    priceCents: price,
    active: z.boolean(),
    compatibleTrims: z.array(slug).min(1),
    includedTrims: z.array(slug),
    features: z.array(z.string().max(200)).nullable().optional(),
    hex: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .nullable()
      .optional(),
    imageUrl: imageUrl.nullable().optional(),
  })
  .strict();
const schemas: Record<string, z.ZodTypeAny> = {
  vehicles: z
    .object({
      slug,
      name: text.min(1),
      description: z.string().max(4000),
      active: z.boolean(),
      specs: z.record(z.union([z.string(), z.number(), z.boolean()])),
    })
    .strict(),
  trims: option
    .omit({ hex: true, imageUrl: true })
    .extend({
      vehicleId: z.string().uuid(),
      symbol: z.string().min(1).max(3),
      power: z.number().int().min(1).max(3000),
      acceleration: z.string().min(1).max(20),
      range: z.string().min(1).max(40),
      drivetrain: text.min(1),
      topSpeed: z.number().int().min(1).max(400),
      defaultWheel: slug,
      specs: z.record(z.string()),
      features: z.array(z.string()),
    })
    .strict(),
  paints: option,
  wheels: option,
  interiors: option,
  packages: option,
  accessories: option,
  images: z
    .object({
      vehicleId: z.string().uuid(),
      url: imageUrl,
      alt: z.string().min(5).max(350),
      trim: nullableText,
      paint: nullableText,
      wheel: nullableText,
      interior: nullableText,
      angle: z.enum([
        "front-3q",
        "rear-3q",
        "side",
        "front",
        "rear",
        "elevated",
        "interior",
        "dashboard",
        "seats",
        "rear-seats",
        "console",
        "wheels",
        "headlight",
        "taillight",
        "charging-port",
        "night",
        "road",
        "charging",
        "screen",
      ]),
      category: z.enum([
        "exterior",
        "interior",
        "details",
        "technology",
        "night",
        "driving",
        "charging",
      ]),
      priority: z.number().int().min(0).max(20),
      active: z.boolean(),
    })
    .strict(),
  users: z
    .object({
      firstName: text,
      lastName: text,
      phone: text,
      role: z.enum(["CUSTOMER", "ADMIN"]),
    })
    .strict(),
  reservations: z
    .object({
      status: z.enum(statuses as [string, ...string[]]),
      deliveryMethod: z.enum(["HOME_DELIVERY", "DEALER_PICKUP"]),
      dealerCode: z.string().trim().max(60).optional(),
      note: z.string().trim().max(2000),
    })
    .strict(),
  dealers: z
    .object({
      name: text.min(1),
      code: slug,
      address: text.min(1),
      city: text.min(1),
      state: text.min(2),
      zip: text.min(3),
      phone: text.min(7),
      email: z.string().email(),
      latitude: z.number().min(-90).max(90).nullable().optional(),
      longitude: z.number().min(-180).max(180).nullable().optional(),
      showroom: z.boolean(),
      service: z.boolean(),
      pickup: z.boolean(),
      delivery: z.boolean(),
      active: z.boolean(),
    })
    .strict(),
  settings: z.object({ key: slug, value: z.unknown() }).strict(),
};
const delegates = {
  vehicles: "vehicle",
  trims: "vehicleTrim",
  paints: "paintColor",
  wheels: "wheelOption",
  interiors: "interiorOption",
  packages: "packageOption",
  accessories: "accessory",
  images: "vehicleImage",
  reservations: "reservation",
  subscriptions: "vehicleSubscription",
  users: "user",
  dealers: "dealer",
  settings: "siteSetting",
  audit: "adminAuditLog",
  emails: "emailOutbox",
} as const;
type Row = Record<string, unknown>;
type Crud = {
  findMany: (args: Record<string, unknown>) => Promise<Row[]>;
  findUnique: (args: Record<string, unknown>) => Promise<Row | null>;
  create: (args: Record<string, unknown>) => Promise<Row>;
  update: (args: Record<string, unknown>) => Promise<Row>;
};
function delegate(db: Prisma.TransactionClient, resource: string): Crud {
  if (!(resource in delegates)) throw new HttpError(404, "Resource not found.");
  return db[delegates[resource as keyof typeof delegates]] as unknown as Crud;
}
export async function listAdminResource(resource: string, offset = 0) {
  await requireAdmin();
  const order = [
    "reservations",
    "users",
    "audit",
    "emails",
    "images",
    "subscriptions",
  ].includes(resource)
    ? { createdAt: "desc" }
    : resource === "settings"
      ? { key: "asc" }
      : { name: "asc" };
  const records = await delegate(getDb(), resource).findMany({
    take: 250,
    skip: offset,
    ...(resource === "reservations"
      ? {
          include: {
            snapshot: true,
            refunds: { orderBy: { createdAt: "desc" } },
            dealer: true,
          },
        }
      : {}),
    orderBy: [order, { id: "asc" }],
  });
  if (resource !== "reservations") return records;
  return records.map((record) => ({
    ...record,
    dealerCode:
      record.dealer && typeof record.dealer === "object"
        ? String((record.dealer as Row).code || "")
        : "",
  }));
}
const reservationSettings = z
  .object({
    amountCents: z.number().int().min(50).max(1000000),
    refundable: z.boolean(),
    available: z.boolean(),
    productionWindow: z.string().min(5).max(250),
    language: z.string().min(60).max(4000),
    agreementVersion: z.string().min(5).max(40),
  })
  .strict();
export async function mutateAdminResource(
  resource: string,
  input: unknown,
  id?: string,
) {
  const admin = await requireAdmin();
  const validator = schemas[resource];
  if (!validator) throw new HttpError(400, "This resource is read only.");
  let data = validator.parse(input) as Row;
  if (!id && ["reservations", "users"].includes(resource))
    throw new HttpError(
      400,
      "These records are created through customer workflows.",
    );
  if (resource === "settings") {
    if (data.key === "reservation")
      data = { ...data, value: reservationSettings.parse(data.value) };
    else if (data.key === "vehicle-subscriptions")
      data = { ...data, value: subscriptionSettingsSchema.parse(data.value) };
    else if (data.key === "purchase-planning")
      data = { ...data, value: purchaseSettingsSchema.parse(data.value) };
    else if (data.key === "announcements")
      data = {
        ...data,
        value: z
          .array(
            z.object({
              title: z.string().min(1).max(150),
              body: z.string().max(2000),
            }),
          )
          .max(10)
          .parse(data.value),
      };
    else
      data = {
        ...data,
        value: z
          .object({
            title: z.string().max(200).optional(),
            body: z.string().max(12000).optional(),
          })
          .strict()
          .parse(data.value),
      };
  }
  if ("compatibleTrims" in data) {
    const compatible = data.compatibleTrims as string[],
      included = data.includedTrims as string[];
    if (included.some((x) => !compatible.includes(x)))
      throw new HttpError(400, "Included trims must also be compatible.");
  }
  return getDb().$transaction(async (tx) => {
    const model = delegate(tx, resource);
    const before = id ? await model.findUnique({ where: { id } }) : null;
    if (id && !before) throw new HttpError(404, "Record not found.");
    if (resource === "users" && id === admin.id && data.role !== "ADMIN")
      throw new HttpError(
        400,
        "You cannot remove your own administrator access.",
      );
    if (resource === "reservations") {
      if (before?.paymentStatus === "PENDING")
        throw new HttpError(409, "Unpaid reservations cannot progress.");
      const status = data.status as OrderStatus;
      const deliveryMethod = String(data.deliveryMethod);
      const statusChanged = before?.status !== status;

      if (before?.status === "CANCELLED" && status !== "CANCELLED")
        throw new HttpError(409, "Cancelled reservations cannot be reopened.");
      const oldIndex = statuses.indexOf(before?.status as string),
        newIndex = statuses.indexOf(status);
      if (statusChanged && status !== "CANCELLED" && newIndex < oldIndex)
        throw new HttpError(409, "Production status cannot move backward.");

      let dealerId: string | null = null;
      if (deliveryMethod === "DEALER_PICKUP") {
        const dealerCode = String(data.dealerCode || "").trim();
        if (!dealerCode)
          throw new HttpError(400, "Choose an active pickup dealer by dealer code.");
        const dealer = await tx.dealer.findUnique({ where: { code: dealerCode } });
        if (!dealer || !dealer.active || !dealer.pickup)
          throw new HttpError(
            409,
            "That dealer is not active for vehicle pickup.",
          );
        dealerId = dealer.id;
      }

      const deliveryChanged =
        before?.deliveryMethod !== deliveryMethod ||
        (before?.dealerId || null) !== dealerId;
      if (!statusChanged && !deliveryChanged) return before;

      const note = String(data.note || "").trim();
      if (statusChanged && note.length < 3)
        throw new HttpError(400, "Add a short note for the production status update.");

      const after = await tx.reservation.update({
        where: { id: id! },
        data: { status, deliveryMethod, dealerId },
      });
      if (statusChanged) {
        await tx.orderStatusHistory.create({
          data: { reservationId: id!, status, note },
        });
        const customer = before?.customer as {
          email?: unknown;
          firstName?: unknown;
        };
        if (typeof customer?.email === "string" && customer.email.includes("@")) {
          await tx.emailOutbox.create({
            data: {
              dedupeKey: `status:${id}:${status}`,
              recipient: customer.email,
              template:
                status === "SHIPPED"
                  ? "shipping-notification"
                  : "order-status-update",
              payload: jsonValue({
                name:
                  typeof customer.firstName === "string"
                    ? customer.firstName
                    : "Dyntree customer",
                number: before?.number,
                status: status.replaceAll("_", " "),
                note,
              }),
            },
          });
        }
      }
      await tx.adminAuditLog.create({
        data: {
          adminId: admin.id,
          action:
            statusChanged && deliveryChanged
              ? "reservation.status-and-delivery.changed"
              : statusChanged
                ? "reservation.status.changed"
                : "reservation.delivery.changed",
          target: `reservation:${id}`,
          before: jsonValue(before),
          after: jsonValue(after),
        },
      });
      return after;
    }
    const after = id
      ? await model.update({ where: { id }, data })
      : await model.create({ data });
    await tx.adminAuditLog.create({
      data: {
        adminId: admin.id,
        action: `${resource}.${id ? "updated" : "created"}`,
        target: `${resource}:${after.id}`,
        before: before ? jsonValue(before) : Prisma.JsonNull,
        after: jsonValue(after),
      },
    });
    return after;
  });
}
