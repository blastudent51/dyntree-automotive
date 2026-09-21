import { getDb } from '@/lib/db';
import { timingSafeEqual } from 'node:crypto';
import { deliverPendingEmails } from '@/lib/email';
export async function GET(request: Request) {
  const expected = `Bearer ${process.env.CRON_SECRET || ''}`;
  const actual = request.headers.get('authorization') || '';
  if (
    !process.env.CRON_SECRET ||
    actual.length !== expected.length ||
    !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
  )
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  await getDb().rateLimit.deleteMany({
    where: { expiresAt: { lt: new Date(Date.now() - 86400000) } },
  });
  return Response.json(await deliverPendingEmails());
}
