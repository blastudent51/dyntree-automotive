import { scheduleEmailDelivery } from '@/lib/email-delivery';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { assertSameOrigin, errorResponse, HttpError, rateLimit, jsonValue } from '@/lib/security';
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    await rateLimit(request, 'cancel-reservation', user.id, 5);
    const { id } = await params;
    const { confirm } = z.object({ confirm: z.literal(true) }).parse(await request.json());
    if (!confirm) throw new HttpError(400, 'Please confirm.');
    const db = getDb();
    await db.$transaction(async (tx) => {
      const r = await tx.reservation.findFirst({ where: { id, userId: user.id } });
      if (!r) throw new HttpError(404, 'Reservation not found.');
      if (
        !['RESERVED', 'CONFIGURATION_SAVED', 'AWAITING_PRODUCTION', 'CANCELLED'].includes(r.status)
      )
        throw new HttpError(409, 'Please contact support to cancel at this stage.');
      if (r.status === 'CANCELLED') return;
      await tx.reservation.update({ where: { id }, data: { status: 'CANCELLED' } });
      await tx.orderStatusHistory.create({
        data: {
          reservationId: id,
          status: 'CANCELLED',
          note: 'Customer requested cancellation. Any eligible refund requires administrator processing.',
        },
      });
      await tx.emailOutbox.upsert({
        where: { dedupeKey: `cancelled:${id}` },
        create: {
          dedupeKey: `cancelled:${id}`,
          recipient: user.email,
          template: 'reservation-cancellation',
          payload: jsonValue({ number: r.number, name: user.firstName }),
        },
        update: {},
      });
    });
    scheduleEmailDelivery();
    return Response.json({
      ok: true,
      message: 'Reservation cancelled. Your eligible refund will be processed separately.',
    });
  } catch (e) {
    return errorResponse(e);
  }
}
