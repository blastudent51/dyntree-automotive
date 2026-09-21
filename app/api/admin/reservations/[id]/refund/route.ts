import { scheduleEmailDelivery } from '@/lib/email-delivery';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { stripeClient } from '@/lib/payments';
import { assertSameOrigin, errorResponse, HttpError, rateLimit, jsonValue } from '@/lib/security';
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    await rateLimit(request, 'admin-refund', admin.id, 8);
    const { id } = await params;
    const input = z
      .object({
        amountCents: z.number().int().min(1),
        reason: z.string().trim().min(5).max(500),
        confirmation: z.literal('REFUND'),
        idempotencyKey: z.string().uuid(),
      })
      .parse(await request.json());
    const db = getDb();
    const key = `refund:${id}:${input.idempotencyKey}`;
    const refund = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Reservation" WHERE id=${id}::uuid FOR UPDATE`;
      const r = await tx.reservation.findUnique({ where: { id }, include: { refunds: true } });
      if (!r || !r.paymentIntentId) throw new HttpError(404, 'Paid reservation not found.');
      if (!r.simulated && r.paymentProvider !== 'stripe') throw new HttpError(409, 'Refund this historical payment through its original provider.');
      if (!r.refundable)
        throw new HttpError(409, 'This reservation was recorded as nonrefundable.');
      const existing = r.refunds.find((x) => x.idempotencyKey === key);
      if (existing) return existing;
      if (!['PAID', 'PARTIALLY_REFUNDED'].includes(r.paymentStatus))
        throw new HttpError(409, 'This payment cannot be refunded.');
      const allocated = r.refunds
        .filter((x) => !['FAILED', 'failed', 'canceled'].includes(x.status))
        .reduce((s, x) => s + x.amountCents, 0);
      if (input.amountCents > r.depositCents - allocated)
        throw new HttpError(400, 'Refund exceeds the available paid balance.');
      return tx.refund.create({
        data: {
          reservationId: id,
          adminId: admin.id,
          idempotencyKey: key,
          amountCents: input.amountCents,
          reason: input.reason,
        },
      });
    });
    if (refund.providerRefundId) return Response.json({ ok: true });
    const r = await db.reservation.findUniqueOrThrow({ where: { id } });
    let providerId: string, status: string;
    if (r.simulated) {
      if (process.env.NODE_ENV === 'production')
        throw new HttpError(409, 'Development payments cannot be processed here.');
      providerId = `sim_refund_${refund.id}`;
      status = 'succeeded';
    } else {
      const result = await stripeClient().refunds.create(
        {
          payment_intent: r.paymentIntentId!,
          amount: refund.amountCents,
          metadata: { reservationId: id, adminId: admin.id, localRefundId: refund.id },
        },
        { idempotencyKey: key },
      );
      providerId = result.id;
      status = result.status || 'pending';
    }
    await db.$transaction(async (tx) => {
      const before = await tx.reservation.findUniqueOrThrow({ where: { id } });
      await tx.refund.update({
        where: { id: refund.id },
        data: { providerRefundId: providerId, status },
      });
      if (status === 'succeeded') {
        const total = await tx.refund.aggregate({
          where: { reservationId: id, status: 'succeeded' },
          _sum: { amountCents: true },
        });
        const full = (total._sum.amountCents || 0) >= r.depositCents;
        await tx.reservation.update({
          where: { id },
          data: {
            paymentStatus: full ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
            ...(full ? { status: 'CANCELLED' } : {}),
          },
        });
        if (
          full &&
          !(await tx.orderStatusHistory.findFirst({
            where: { reservationId: id, status: 'CANCELLED' },
          }))
        )
          await tx.orderStatusHistory.create({
            data: {
              reservationId: id,
              status: 'CANCELLED',
              note: 'Reservation refunded by administrator.',
            },
          });
        const customer = r.customer as { email: string; firstName: string };
        await tx.emailOutbox.upsert({
          where: { dedupeKey: `refund:${providerId}` },
          create: {
            dedupeKey: `refund:${providerId}`,
            recipient: customer.email,
            template: 'refund-confirmation',
            payload: jsonValue({
              name: customer.firstName,
              number: r.number,
              amountCents: refund.amountCents,
            }),
          },
          update: {},
        });
      }
      await tx.adminAuditLog.create({
        data: {
          adminId: admin.id,
          action: 'reservation.refund.issued',
          target: `reservation:${id}`,
          before: jsonValue(before),
          after: jsonValue({
            refundId: refund.id,
            providerRefundId: providerId,
            amountCents: refund.amountCents,
            status,
            reason: refund.reason,
          }),
        },
      });
    });
    scheduleEmailDelivery();
    return Response.json({ ok: true, status });
  } catch (e) {
    return errorResponse(e);
  }
}
