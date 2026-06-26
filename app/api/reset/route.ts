import { seedDemo } from "@/lib/seed";
import { ok, handleError, requireAdmin } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    const body = await req.json().catch(() => ({}));
    const stock = Math.min(Math.max(Number(body?.stock) || 100, 1), 1000);
    const r = await seedDemo(stock);
    return ok(r);
  } catch (e) {
    return handleError(e);
  }
}
