import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { assertSameOrigin, errorResponse, rateLimit } from "@/lib/security";
import { inviteSubscription } from "@/lib/subscriptions";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    await rateLimit(request, "subscription-invite", admin.id, 10);
    const data = z
      .object({
        reservationNumber: z.string().regex(/^DYN-M1E-\d{6,}$/),
        priceId: z.string().regex(/^price_[A-Za-z0-9]+$/),
        confirmReady: z.literal(true),
      })
      .strict()
      .parse(await request.json());
    return Response.json(
      {
        record: await inviteSubscription(
          admin.id,
          data.reservationNumber,
          data.priceId,
        ),
      },
      { status: 201 },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
