import {
  defaultPurchaseSettings,
  purchaseSettingsSchema,
} from "./purchase-planning";
import { getDb } from "./db";
import { seedCatalog } from "./seed-catalog";
import assets from "./generated-assets.json";
import type { Catalog, VehicleAsset } from "./types";
export async function getCatalog(): Promise<Catalog> {
  if (!process.env.DATABASE_URL)
    return { ...seedCatalog, images: assets as VehicleAsset[] };
  const db = getDb();
  const [
    vehicle,
    trims,
    paints,
    wheels,
    interiors,
    packages,
    accessories,
    images,
    settings,
    announcement,
  ] = await Promise.all([
    db.vehicle.findUnique({ where: { slug: "m1e" } }),
    db.vehicleTrim.findMany({
      where: { active: true, vehicle: { slug: "m1e" } },
      orderBy: { priceCents: "asc" },
    }),
    db.paintColor.findMany({
      where: { active: true },
      orderBy: { priceCents: "asc" },
    }),
    db.wheelOption.findMany({
      where: { active: true },
      orderBy: { priceCents: "asc" },
    }),
    db.interiorOption.findMany({
      where: { active: true },
      orderBy: { priceCents: "asc" },
    }),
    db.packageOption.findMany({ where: { active: true } }),
    db.accessory.findMany({ where: { active: true } }),
    db.vehicleImage.findMany({
      where: { active: true, vehicle: { slug: "m1e" } },
    }),
    db.siteSetting.findUnique({ where: { key: "reservation" } }),
    db.siteSetting.findUnique({ where: { key: "announcements" } }),
  ]);
  if (!vehicle || !vehicle.active || !trims.length)
    throw Error(
      "Vehicle catalog is not seeded. Run the documented database setup.",
    );
  return JSON.parse(
    JSON.stringify({
      vehicle,
      trims,
      paints,
      wheels,
      interiors,
      packages,
      accessories,
      images: images.length ? images : assets,
      settings: settings?.value || seedCatalog.settings,
      announcements: announcement?.value || [],
      purchaseSettings: purchaseSettingsSchema.parse(defaultPurchaseSettings),
    }),
  ) as Catalog;
}
