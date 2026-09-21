import type { PurchasePreference, PurchaseSettings } from "./purchase-planning";
export type CatalogOption = {
  id?: string;
  slug: string;
  name: string;
  priceCents: number;
  active: boolean;
  description: string;
  compatibleTrims: string[];
  includedTrims: string[];
  features?: string[];
  hex?: string;
  imageUrl?: string;
};
export type Trim = CatalogOption & {
  symbol: string;
  power: number;
  acceleration: string;
  range: string;
  drivetrain: string;
  topSpeed: number;
  defaultWheel: string;
  specs: Record<string, string>;
};
export type VehicleAsset = {
  id?: string;
  url: string;
  alt: string;
  trim: string | null;
  paint: string | null;
  wheel: string | null;
  interior: string | null;
  angle: string;
  category: string;
  priority: number;
  active: boolean;
};
export type ReservationSettings = {
  amountCents: number;
  refundable: boolean;
  available: boolean;
  productionWindow: string;
  language: string;
  agreementVersion: string;
};
export type Catalog = {
  vehicle: {
    slug: string;
    name: string;
    description: string;
    specs?: Record<string, string | number | boolean>;
  };
  trims: Trim[];
  paints: CatalogOption[];
  wheels: CatalogOption[];
  interiors: CatalogOption[];
  packages: CatalogOption[];
  accessories: CatalogOption[];
  images: VehicleAsset[];
  settings: ReservationSettings;
  purchaseSettings?: PurchaseSettings;
  announcements: { title: string; body: string }[];
};
export type Configuration = {
  purchasePreference?: PurchasePreference;
  trim: string;
  paint: string;
  wheels: string;
  interior: string;
  packages: string[];
  accessories: string[];
};
export type PriceLine = { label: string; priceCents: number; category: string };

export type DealerSummary = {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude: number | null;
  longitude: number | null;
  phone: string;
  email: string;
  showroom: boolean;
  service: boolean;
  pickup: boolean;
  delivery: boolean;
  active: boolean;
};
