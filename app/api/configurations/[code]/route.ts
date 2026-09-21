import { getDb } from '@/lib/db';
import { errorResponse, HttpError } from '@/lib/security';
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    if (!/^M1E-[A-F0-9]{10}$/.test(code)) throw new HttpError(404, 'Configuration not found.');
    const result = await getDb().savedConfiguration.findUnique({
      where: { code },
      select: { code: true, configuration: true, estimatedPriceCents: true },
    });
    if (!result) throw new HttpError(404, 'Configuration not found.');
    return Response.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
