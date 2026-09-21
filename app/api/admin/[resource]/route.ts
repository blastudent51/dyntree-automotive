import { scheduleEmailDelivery } from '@/lib/email-delivery';
import { z } from 'zod';
import { listAdminResource, mutateAdminResource } from '@/lib/admin';
import { requireAdmin } from '@/lib/auth';
import { assertSameOrigin, errorResponse, rateLimit } from '@/lib/security';
export async function GET(request: Request, { params }: { params: Promise<{ resource: string }> }) {
  try {
    const offset = z.coerce
      .number()
      .int()
      .min(0)
      .max(10000000)
      .parse(new URL(request.url).searchParams.get('offset') || 0);
    const records = await listAdminResource((await params).resource, offset);
    return Response.json(
      { records, nextOffset: records.length === 250 ? offset + 250 : null },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    await rateLimit(request, 'admin-edit', admin.id, 40);
    const input = z
      .object({ id: z.string().uuid().optional(), data: z.unknown() })
      .parse(await request.json());
    const record = await mutateAdminResource((await params).resource, input.data, input.id);
    scheduleEmailDelivery();
    return Response.json({ record });
  } catch (e) {
    return errorResponse(e);
  }
}
