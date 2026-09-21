import { describe, it, expect, vi, afterEach } from "vitest";
import {
  assertSameOrigin,
  errorResponse,
  localSimulationEnabled,
} from "../lib/security";
import { devAuthEnabled } from "../lib/auth";
afterEach(() => vi.unstubAllEnvs());
describe("server security gates", () => {
  it("logs Prisma codes without leaking query or connection details", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const error = Object.assign(
        new Error("secret database URL and customer input"),
        {
          name: "PrismaClientKnownRequestError",
          code: "P2022",
          meta: { query: "private customer data" },
        },
      );
      const response = errorResponse(error);
      expect(response.status).toBe(500);
      expect(log).toHaveBeenCalledWith("Request failed:", {
        name: "PrismaClientKnownRequestError",
        code: "P2022",
      });
      expect(await response.text()).not.toContain("secret");
    } finally {
      log.mockRestore();
    }
  });
  it("rejects cross-origin mutations and missing origins", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://dyntree.example");
    expect(() =>
      assertSameOrigin(
        new Request("https://dyntree.example/api/checkout", {
          headers: { origin: "https://attacker.example" },
        }),
      ),
    ).toThrow();
    expect(() =>
      assertSameOrigin(new Request("https://dyntree.example/api/checkout")),
    ).toThrow();
    expect(() =>
      assertSameOrigin(
        new Request("https://dyntree.example/api/checkout", {
          headers: { origin: "https://dyntree.example" },
        }),
      ),
    ).not.toThrow();
  });
  it("cannot enable simulated payments or development sign-in in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEV_PAYMENT_SIMULATION", "true");
    vi.stubEnv("DEV_AUTH_ENABLED", "true");
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    vi.stubEnv("CLERK_SECRET_KEY", "");
    expect(localSimulationEnabled()).toBe(false);
    expect(devAuthEnabled()).toBe(false);
  });
  it("requires explicit development opt-in and no Stripe key", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEV_PAYMENT_SIMULATION", "false");
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    expect(localSimulationEnabled()).toBe(false);
    vi.stubEnv("DEV_PAYMENT_SIMULATION", "true");
    expect(localSimulationEnabled()).toBe(true);
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_placeholder");
    expect(localSimulationEnabled()).toBe(false);
  });
});
