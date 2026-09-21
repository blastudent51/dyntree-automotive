import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { getCatalog } from '@/lib/catalog';
import { getDb } from '@/lib/db';
import {
  configurationSchema,
  priceConfiguration,
  validateConfiguration,
} from '@/lib/configuration';
import { assertSameOrigin, errorResponse, rateLimit, HttpError, jsonValue } from '@/lib/security';
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    await rateLimit(request, 'save-configuration', user.id, 20);
    const input = z
      .object({ name: z.string().trim().min(1).max(80), configuration: configurationSchema })
      .parse(await request.json());
    const catalog = await getCatalog();
    let config;
    try {
      config = validateConfiguration(catalog, input.configuration);
    } catch (e) {
      throw new HttpError(400, e instanceof Error ? e.message : 'Invalid configuration.');
    }
    const quote = priceConfiguration(catalog, config);
    const saved = await getDb().savedConfiguration.create({
      data: {
        userId: user.id,
        name: input.name,
        code: `M1E-${randomBytes(5).toString('hex').toUpperCase()}`,
        configuration: jsonValue(config),
        estimatedPriceCents: quote.totalCents,
      },
    });
    return Response.json({ id: saved.id, code: saved.code }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    await rateLimit(request, 'delete-configuration', user.id);
    const { id } = z.object({ id: z.string().uuid() }).parse(await request.json());
    const result = await getDb().savedConfiguration.deleteMany({ where: { id, userId: user.id } });
    if (!result.count) throw new HttpError(404, 'Configuration not found.');
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
