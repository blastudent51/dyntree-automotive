import { createHash } from "node:crypto";
import { getDb } from "./db";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function appOrigin() {
  const origin = process.env.NEXT_PUBLIC_APP_URL;
  if (!origin) throw new HttpError(503, "Application URL is not configured.");
  return new URL(origin).origin;
}
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const allowed = [process.env.NEXT_PUBLIC_APP_URL];
  if (process.env.NODE_ENV !== "production")
    allowed.push(
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://terminal.local:4173",
    );
  if (!origin || !allowed.some((x) => x && new URL(x).origin === origin))
    throw new HttpError(403, "Request origin is not allowed.");
}
export async function rateLimit(
  request: Request,
  action: string,
  subject = "",
  limit = 30,
) {
  const window = 60_000;
  const now = Date.now();
  const identity =
    subject ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "anonymous";
  const key = createHash("sha256")
    .update(`${action}:${identity}:${Math.floor(now / window)}`)
    .digest("hex");
  const row = await getDb().rateLimit.upsert({
    where: { key },
    create: {
      key,
      count: 1,
      expiresAt: new Date(Math.ceil(now / window) * window),
    },
    update: { count: { increment: 1 } },
  });
  if (row.count > limit)
    throw new HttpError(
      429,
      "Too many requests. Please try again in a minute.",
    );
}
export function errorResponse(error: unknown) {
  if (error instanceof HttpError)
    return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof Error && error.name === "ZodError")
    return Response.json(
      { error: "Please check the submitted fields." },
      { status: 400 },
    );
  const code =
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string" &&
    /^P\d{4}$/.test(error.code)
      ? error.code
      : undefined;
  // Prisma messages can contain customer inputs or connection details. Log only
  // the diagnostic code, never the query, raw message, or adapter metadata.
  console.error("Request failed:", {
    name: error instanceof Error ? error.name : "Unknown error",
    ...(code ? { code } : {}),
  });
  return Response.json(
    { error: "We could not complete that request. Please try again." },
    { status: 500 },
  );
}
export function safeReturnTo(value: string | null | undefined) {
  return value?.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\")
    ? value
    : "/account";
}
export const jsonValue = (v: unknown) => JSON.parse(JSON.stringify(v));
export function localSimulationEnabled() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.DEV_PAYMENT_SIMULATION === "true" &&
    !process.env.STRIPE_SECRET_KEY
  );
}
