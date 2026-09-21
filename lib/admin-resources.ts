export type AdminField = {
  key: string;
  label: string;
  type?:
    "text" | "number" | "checkbox" | "textarea" | "json" | "array" | "select";
  options?: string[];
  required?: boolean;
};
export type AdminResource = {
  slug: string;
  label: string;
  fields: AdminField[];
  readOnly?: boolean;
  columns: string[];
};
const basic: AdminField[] = [
  { key: "slug", label: "Slug", required: true },
  { key: "name", label: "Name", required: true },
  {
    key: "description",
    label: "Description",
    type: "textarea",
    required: true,
  },
  {
    key: "priceCents",
    label: "Price (USD cents)",
    type: "number",
    required: true,
  },
  { key: "active", label: "Active", type: "checkbox" },
  {
    key: "compatibleTrims",
    label: "Compatible trims (comma separated)",
    type: "array",
  },
  {
    key: "includedTrims",
    label: "Included in trims (comma separated)",
    type: "array",
  },
  { key: "features", label: "Features (JSON array)", type: "json" },
  { key: "hex", label: "Swatch hex color" },
  { key: "imageUrl", label: "Option image URL" },
];
export const statuses = [
  "RESERVED",
  "CONFIGURATION_SAVED",
  "AWAITING_PRODUCTION",
  "ORDER_INVITATION",
  "ORDER_CONFIRMED",
  "SCHEDULED_FOR_PRODUCTION",
  "IN_PRODUCTION",
  "QUALITY_INSPECTION",
  "READY_TO_SHIP",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];
export const adminResources: AdminResource[] = [
  {
    slug: "vehicles",
    label: "Vehicles",
    columns: ["name", "slug", "active"],
    fields: [
      { key: "slug", label: "Slug", required: true },
      { key: "name", label: "Name", required: true },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        required: true,
      },
      { key: "active", label: "Active", type: "checkbox" },
      { key: "specs", label: "Specifications (JSON)", type: "json" },
    ],
  },
  {
    slug: "trims",
    label: "Trims & pricing",
    columns: ["name", "priceCents", "power", "active"],
    fields: [
      ...basic.filter((x) => !["hex", "imageUrl"].includes(x.key)),
      { key: "vehicleId", label: "Vehicle UUID", required: true },
      { key: "symbol", label: "Trim symbol", required: true },
      {
        key: "power",
        label: "Target horsepower",
        type: "number",
        required: true,
      },
      { key: "acceleration", label: "Target 0–60 seconds", required: true },
      { key: "range", label: "Target range (miles)", required: true },
      { key: "drivetrain", label: "Drivetrain", required: true },
      {
        key: "topSpeed",
        label: "Target top speed (mph)",
        type: "number",
        required: true,
      },
      { key: "defaultWheel", label: "Default wheel slug", required: true },
      { key: "specs", label: "Equipment comparison (JSON)", type: "json" },
    ],
  },
  ...(
    [
      ["paints", "Paints"],
      ["wheels", "Wheels"],
      ["interiors", "Interiors"],
      ["packages", "Packages"],
      ["accessories", "Accessories"],
    ] as const
  ).map(([slug, label]) => ({
    slug,
    label,
    columns: ["name", "priceCents", "active"],
    fields: basic,
  })),
  {
    slug: "images",
    label: "Prototype images",
    columns: ["alt", "angle", "trim", "paint", "active"],
    fields: [
      { key: "vehicleId", label: "Vehicle UUID", required: true },
      { key: "url", label: "Image URL (local path or HTTPS)", required: true },
      { key: "alt", label: "Accessible image description", required: true },
      ...["trim", "paint", "wheel", "interior"].map((key) => ({
        key,
        label: `${key} slug (blank for any)`,
      })),
      {
        key: "angle",
        label: "Angle",
        type: "select",
        options: [
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
        ],
      },
      {
        key: "category",
        label: "Marketing category",
        type: "select",
        options: [
          "exterior",
          "interior",
          "details",
          "technology",
          "night",
          "driving",
          "charging",
        ],
      },
      { key: "priority", label: "Priority", type: "number" },
      { key: "active", label: "Active", type: "checkbox" },
    ],
  },
  {
    slug: "reservations",
    label: "Reservations",
    columns: ["number", "status", "paymentStatus", "deliveryMethod", "depositCents"],
    fields: [
      {
        key: "status",
        label: "Production status",
        type: "select",
        options: statuses,
      },
      {
        key: "deliveryMethod",
        label: "Delivery method",
        type: "select",
        options: ["HOME_DELIVERY", "DEALER_PICKUP"],
      },
      {
        key: "dealerCode",
        label: "Dealer code (required for dealer pickup)",
      },
      { key: "note", label: "Status update note", type: "textarea" },
    ],
  },
  {
    slug: "users",
    label: "Customers",
    columns: ["email", "firstName", "role", "createdAt"],
    fields: [
      { key: "firstName", label: "First name" },
      { key: "lastName", label: "Last name" },
      { key: "phone", label: "Phone" },
      {
        key: "role",
        label: "Role",
        type: "select",
        options: ["CUSTOMER", "ADMIN"],
      },
    ],
  },
  {
    slug: "dealers",
    label: "Dealers",
    columns: ["name", "code", "city", "pickup", "service", "active"],
    fields: [
      ...[
        "name",
        "code",
        "address",
        "city",
        "state",
        "zip",
        "phone",
        "email",
      ].map((key) => ({
        key,
        label: key,
        required: true,
      })),
      { key: "latitude", label: "Latitude", type: "number" },
      { key: "longitude", label: "Longitude", type: "number" },
      ...["showroom", "service", "pickup", "delivery", "active"].map((key) => ({
        key,
        label: key,
        type: "checkbox" as const,
      })),
    ],
  },
  {
    slug: "settings",
    label: "Site content & settings",
    columns: ["key", "updatedAt"],
    fields: [
      { key: "key", label: "Content key", required: true },
      {
        key: "value",
        label: "Content value (JSON)",
        type: "json",
        required: true,
      },
    ],
  },
  {
    slug: "subscriptions",
    label: "Monthly subscriptions",
    columns: [
      "id",
      "status",
      "monthlyCents",
      "stripeSubscriptionId",
      "cancelAtPeriodEnd",
    ],
    fields: [],
    readOnly: true,
  },
  {
    slug: "audit",
    label: "Audit log",
    columns: ["action", "target", "adminId", "createdAt"],
    fields: [],
    readOnly: true,
  },
  {
    slug: "emails",
    label: "Email outbox",
    columns: ["recipient", "template", "status", "attempts"],
    fields: [],
    readOnly: true,
  },
];
