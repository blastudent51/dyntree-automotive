import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { leaseOfferInputSchema } from "@/lib/lease-offers";
import { assertSameOrigin, errorResponse, rateLimit } from "@/lib/security";
import { generateLeaseInvitation } from "@/lib/subscriptions";

const requestSchema = leaseOfferInputSchema
  .extend({
    reservationNumber: z.string().regex(/^DYN-M1E-\d{6,}$/),
    confirmLease: z.literal(true),
  })
  .strict();

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    await rateLimit(request, "lease-offer-generate", admin.id, 10);

    const data = requestSchema.parse(await request.json());
    const result = await generateLeaseInvitation(
      admin.id,
      data.reservationNumber,
      {
        termMonths: data.termMonths,
        downPercent: data.downPercent,
        annualMiles: data.annualMiles,
      },
    );

    return Response.json(result, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
