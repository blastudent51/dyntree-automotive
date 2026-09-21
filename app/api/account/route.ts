import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { assertSameOrigin, errorResponse, rateLimit } from '@/lib/security';
import { addressSchema } from '@/lib/validation';
export async function GET() {
  try {
    const user = await requireUser();
    const db = getDb();
    const [configurations, reservations, dealers] = await Promise.all([
      db.savedConfiguration.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      }),
      db.reservation.findMany({
        where: {
          userId: user.id,
          paymentStatus: { in: ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'] },
        },
        include: {
          snapshot: true,
          history: { orderBy: { createdAt: 'asc' } },
          payments: true,
          refunds: true,
          dealer: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.dealer.findMany({
        where: { active: true, pickup: true },
        orderBy: [{ state: 'asc' }, { city: 'asc' }, { name: 'asc' }],
      }),
    ]);
    return Response.json(
      { user, configurations, reservations, dealers },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    await rateLimit(request, 'profile', user.id);
    const data = z
      .object({
        firstName: z.string().trim().min(1).max(60),
        lastName: z.string().trim().min(1).max(60),
        phone: z.string().trim().max(30),
        deliveryAddress: addressSchema.optional(),
        billingAddress: addressSchema.optional(),
      })
      .strict()
      .parse(await request.json());
    await getDb().user.update({ where: { id: user.id }, data });
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
