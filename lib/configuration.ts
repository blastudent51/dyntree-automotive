import { purchasePreferenceSchema } from "./purchase-planning";
import { z } from "zod";
import type { Catalog, CatalogOption, Configuration, PriceLine } from "./types";
export const configurationSchema = z
  .object({
    purchasePreference: purchasePreferenceSchema.optional(),
    trim: z.string().max(40),
    paint: z.string().max(40),
    wheels: z.string().max(40),
    interior: z.string().max(40),
    packages: z.array(z.string().max(40)).max(12).default([]),
    accessories: z.array(z.string().max(40)).max(20).default([]),
  })
  .strict();
export const money = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
export const compatible = (option: CatalogOption, trim: string) =>
  option.active && option.compatibleTrims.includes(trim);
export function defaultConfiguration(
  catalog: Catalog,
  trim = "divide",
): Configuration {
  const t =
    catalog.trims.find((x) => x.slug === trim && x.active) || catalog.trims[0];
  if (!t) throw Error("No vehicle trims are available.");
  const selectDefault = (options: CatalogOption[], preferred: string) => {
    const choices = options.filter((option) => compatible(option, t.slug));
    const chosen =
      choices.find((option) => option.slug === preferred) ||
      choices.find((option) => option.includedTrims.includes(t.slug)) ||
      choices[0];
    if (!chosen)
      throw Error("The vehicle catalog has no compatible default option.");
    return chosen.slug;
  };
  return {
    trim: t.slug,
    paint: selectDefault(catalog.paints, "graphite"),
    wheels: selectDefault(catalog.wheels, t.defaultWheel),
    interior: selectDefault(catalog.interiors, "graphite"),
    packages: [],
    accessories: [],
  };
}
export function validateConfiguration(
  catalog: Catalog,
  input: unknown,
): Configuration {
  const c = configurationSchema.parse(input);
  const t = catalog.trims.find((x) => x.slug === c.trim && x.active);
  if (!t) throw Error("This trim is unavailable.");
  for (const [group, slug] of [
    ["paints", c.paint],
    ["wheels", c.wheels],
    ["interiors", c.interior],
  ] as const) {
    const item = catalog[group].find((x) => x.slug === slug);
    if (!item || !compatible(item, c.trim))
      throw Error(`This ${group} selection is unavailable for ${t.name}.`);
  }
  for (const key of ["packages", "accessories"] as const) {
    if (new Set(c[key]).size !== c[key].length)
      throw Error("Duplicate options are not permitted.");
    for (const slug of c[key]) {
      const item = catalog[key].find((x) => x.slug === slug);
      if (!item || !compatible(item, c.trim))
        throw Error("An option is incompatible with this trim.");
    }
  }
  if (c.packages.includes("dynamic") && c.wheels !== "dynamic19")
    throw Error("Dynamic Package requires 19-inch Dynamic wheels.");
  return c;
}
export function priceConfiguration(catalog: Catalog, input: Configuration) {
  const c = validateConfiguration(catalog, input);
  const t = catalog.trims.find((x) => x.slug === c.trim)!;
  const lines: PriceLine[] = [
    { label: `M1E ${t.name}`, priceCents: t.priceCents, category: "Vehicle" },
  ];
  const add = (item: CatalogOption, category: string) =>
    lines.push({
      label: item.name,
      category,
      priceCents:
        item.includedTrims.includes(c.trim) ||
        (category === "Wheels" &&
          c.packages.includes("dynamic") &&
          item.slug === "dynamic19")
          ? 0
          : item.priceCents,
    });
  add(
    catalog.paints.find((x) => x.slug === c.paint)!,
    "Paint",
  );
  add(
    catalog.wheels.find((x) => x.slug === c.wheels)!,
    "Wheels",
  );
  add(
    catalog.interiors.find((x) => x.slug === c.interior)!,
    "Interior",
  );
  for (const key of ["packages", "accessories"] as const)
    for (const item of catalog[key].filter((x) => c[key].includes(x.slug)))
      add(item, key === "packages" ? "Package" : "Accessory");
  return { lines, totalCents: lines.reduce((s, x) => s + x.priceCents, 0) };
}
export function configurationQuery(c: Configuration) {
  const params = new URLSearchParams({
    trim: c.trim,
    paint: c.paint,
    wheels: c.wheels,
    interior: c.interior,
  });
  if (c.packages.length) params.set("packages", c.packages.join(","));
  if (c.accessories.length) params.set("accessories", c.accessories.join(","));
  if (c.purchasePreference)
    params.set("payment", JSON.stringify(c.purchasePreference));
  return params.toString();
}
export function configurationFromQuery(
  catalog: Catalog,
  query: URLSearchParams,
) {
  const base = defaultConfiguration(catalog, query.get("trim") || "divide");
  let purchasePreference;
  try {
    const raw = query.get("payment");
    if (raw && raw.length <= 500) {
      const parsed = purchasePreferenceSchema.safeParse(JSON.parse(raw));
      if (parsed.success) purchasePreference = parsed.data;
    }
  } catch {
    /* Ignore malformed planning parameters, preserving the vehicle. */
  }
  const candidate = {
    ...(purchasePreference ? { purchasePreference } : {}),
    ...base,
    ...Object.fromEntries(
      ["trim", "paint", "wheels", "interior"].flatMap((k) =>
        query.get(k) ? [[k, query.get(k)!]] : [],
      ),
    ),
    packages: (query.get("packages") || "").split(",").filter(Boolean),
    accessories: (query.get("accessories") || "").split(",").filter(Boolean),
  };
  try {
    return validateConfiguration(catalog, candidate);
  } catch {
    return base;
  }
}
