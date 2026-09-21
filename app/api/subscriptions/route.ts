import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { errorResponse } from "@/lib/security";
export async function GET() {
  try {
    const user = await requireUser();
    const records = await getDb().vehicleSubscription.findMany({
      where: { userId: user.id },
      include: {
        invoices: { orderBy: { createdAt: "desc" }, take: 24 },
        reservation: { select: { number: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return Response.json(
      { records },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
