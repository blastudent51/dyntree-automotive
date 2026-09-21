import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin, errorResponse, rateLimit } from "@/lib/security";
import { subscriptionPortal } from "@/lib/subscriptions";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    await rateLimit(request, "subscription-portal", user.id, 10);
    const data = z
      .object({ id: z.string().uuid() })
      .strict()
      .parse(await request.json());
    const session = await subscriptionPortal(user.id, data.id);
    return Response.json({ url: session.url });
  } catch (e) {
    return errorResponse(e);
  }
}
