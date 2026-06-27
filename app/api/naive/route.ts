import { runNaiveDrop } from "@/lib/naive";
import { ok, fail, handleError, requireAdmin } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Demo-only: run the "normal store" race against the same flood. Genuinely
 * oversells because the naive checkout has no per-unit guard. See lib/naive.ts.
 */
export async function POST(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    const body = await req.json().catch(() => ({}));
    if (!body?.dropId) return fail("bad_request", "dropId required");
    const stock = Math.min(Math.max(Number(body.stock) || 100, 1), 1000);
    const attempts = Math.min(Math.max(Number(body.attempts) || 5000, 1), 20000);
    const r = await runNaiveDrop({ dropId: String(body.dropId), stock, attempts });
    return ok(r);
  } catch (e) {
    return handleError(e);
  }
}
