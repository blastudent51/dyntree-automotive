import { describe, expect, it } from "vitest";
import { checkoutSchema } from "../lib/validation";
import { defaultConfiguration } from "../lib/configuration";
import { seedCatalog } from "../lib/seed-catalog";

const address = {
  line1: "100 Example Street",
  line2: "",
  city: "Example City",
  state: "LA",
  postalCode: "70000",
  country: "US" as const,
};

const base = {
  configuration: defaultConfiguration(seedCatalog),
  firstName: "Test",
  lastName: "Driver",
  email: "driver@example.com",
  phone: "5555550100",
  billingAddress: address,
  deliveryAddress: address,
  agreement: true,
  agreementVersion: "2026-09-21",
  idempotencyKey: "a6dcab3d-a08f-48da-af2e-0486833e1b39",
};

describe("reservation delivery selection", () => {
  it("allows home delivery without a dealer", () => {
    expect(
      checkoutSchema.parse({
        ...base,
        deliveryMethod: "HOME_DELIVERY",
        dealerId: null,
      }).deliveryMethod,
    ).toBe("HOME_DELIVERY");
  });

  it("requires a dealer UUID for dealer pickup", () => {
    expect(() =>
      checkoutSchema.parse({
        ...base,
        deliveryMethod: "DEALER_PICKUP",
        dealerId: null,
      }),
    ).toThrow();

    expect(
      checkoutSchema.parse({
        ...base,
        deliveryMethod: "DEALER_PICKUP",
        dealerId: "1a9c5153-196f-43c1-88ac-b17ae4a0ba8d",
      }).dealerId,
    ).toBe("1a9c5153-196f-43c1-88ac-b17ae4a0ba8d");
  });
});
