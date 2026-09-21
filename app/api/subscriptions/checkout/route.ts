import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin, errorResponse, rateLimit } from "@/lib/security";
import { startSubscription } from "@/lib/subscriptions";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    await rateLimit(request, "subscription-checkout", user.id, 10);
    const data = z
      .object({
        id: z.string().uuid(),
        termsVersion: z.string().max(60),
        agree: z.literal(true),
      })
      .strict()
      .parse(await request.json());
    return Response.json(
      await startSubscription(user.id, data.id, data.termsVersion),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
