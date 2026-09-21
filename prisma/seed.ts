import { defaultSubscriptionSettings } from "../lib/subscription-settings";
import { defaultPurchaseSettings } from "../lib/purchase-planning";
import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { seedCatalog } from "../lib/seed-catalog";
import assets from "../lib/generated-assets.json";
import { defaultVehicleSpecs } from "../lib/vehicle-specs";
const db = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
});
const json = (x: unknown) =>
  JSON.parse(JSON.stringify(x)) as Prisma.InputJsonValue;
async function main() {
  const v = await db.vehicle.upsert({
    where: { slug: "m1e" },
    create: {
      ...seedCatalog.vehicle,
      specs: defaultVehicleSpecs,
    },
    update: {},
  });
  for (const t of seedCatalog.trims) {
    await db.vehicleTrim.upsert({
      where: { slug: t.slug },
      create: {
        slug: t.slug,
        name: t.name,
        description: t.description,
        priceCents: t.priceCents,
        symbol: t.symbol,
        power: t.power,
        acceleration: t.acceleration,
        range: t.range,
        drivetrain: t.drivetrain,
        topSpeed: t.topSpeed,
        defaultWheel: t.defaultWheel,
        active: t.active,
        compatibleTrims: t.compatibleTrims,
        includedTrims: t.includedTrims,
        vehicleId: v.id,
        features: json(t.features),
        specs: json(t.specs),
      },
      update: {},
    });
  }
  for (const [key, model] of [
    ["paints", "paintColor"],
    ["wheels", "wheelOption"],
    ["interiors", "interiorOption"],
    ["packages", "packageOption"],
    ["accessories", "accessory"],
  ] as const) {
    for (const item of seedCatalog[key]) {
      await (
        db[model] as unknown as {
          upsert: (args: Prisma.PaintColorUpsertArgs) => Promise<unknown>;
        }
      ).upsert({
        where: { slug: item.slug },
        create: {
          slug: item.slug,
          name: item.name,
          description: item.description,
          priceCents: item.priceCents,
          hex: item.hex,
          imageUrl: item.imageUrl,
          active: item.active,
          compatibleTrims: item.compatibleTrims,
          includedTrims: item.includedTrims,
          features: item.features ? json(item.features) : Prisma.JsonNull,
        },
        update: {},
      });
    }
  }
  for (const asset of assets) {
    const exists = await db.vehicleImage.findFirst({
      where: { url: asset.url },
    });
    if (!exists)
      await db.vehicleImage.create({ data: { ...asset, vehicleId: v.id } });
  }
  await db.siteSetting.upsert({
    where: { key: "reservation" },
    create: { key: "reservation", value: json(seedCatalog.settings) },
    update: {},
  });
  await db.siteSetting.upsert({
    where: { key: "announcements" },
    create: { key: "announcements", value: [] },
    update: {},
  });
  await db.siteSetting.upsert({
    where: { key: "purchase-planning" },
    create: { key: "purchase-planning", value: json(defaultPurchaseSettings) },
    update: {},
  });
  await db.siteSetting.upsert({
    where: { key: "vehicle-subscriptions" },
    create: {
      key: "vehicle-subscriptions",
      value: json(defaultSubscriptionSettings),
    },
    update: {},
  });
  await db.counter.upsert({
    where: { id: "reservation" },
    create: { id: "reservation", value: 0 },
    update: {},
  });
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.DEV_AUTH_ENABLED === "true"
  )
    for (const role of ["CUSTOMER", "ADMIN"] as const)
      await db.user.upsert({
        where: { email: `${role.toLowerCase()}@example.com` },
        create: {
          email: `${role.toLowerCase()}@example.com`,
          firstName: role === "ADMIN" ? "Alex" : "Jordan",
          lastName: "Demo",
          role,
        },
        update: {},
      });
  console.log(
    "Dyntree catalog seeded. Existing prices and settings were preserved.",
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
