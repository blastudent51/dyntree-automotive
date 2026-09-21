import { z } from 'zod';
import { cookies } from 'next/headers';
import { createDevSession, devAuthEnabled } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { assertSameOrigin, errorResponse, HttpError, rateLimit } from '@/lib/security';
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (!devAuthEnabled()) throw new HttpError(404, 'Not found.');
    await rateLimit(request, 'dev-login', '', 10);
    const { role } = z.object({ role: z.enum(['customer', 'admin']) }).parse(await request.json());
    const user = await getDb().user.findUnique({ where: { email: `${role}@example.com` } });
    if (!user) throw new HttpError(503, 'Run the development seed first.');
    (await cookies()).set('dyntree-dev-session', await createDevSession(user.id), {
      httpOnly: true,
      sameSite: 'lax',
      secure: new URL(request.url).protocol === 'https:',
      maxAge: 4 * 60 * 60,
      path: '/',
    });
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    if (!devAuthEnabled()) throw new HttpError(404, 'Not found.');
    (await cookies()).delete('dyntree-dev-session');
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
