import { floodBots } from "@/lib/engine";
import { ok, fail, handleError, regionOf, requireAdmin } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    const body = await req.json();
    if (!body?.dropId) return fail("bad_request", "dropId required");
    const attempts = Math.min(Math.max(Number(body.attempts) || 5000, 1), 1_000_000);
    const distinct = body.distinct ? Math.min(Math.max(Number(body.distinct), 1), 5000) : undefined;
    const r = await floodBots({
      dropId: String(body.dropId),
      attempts,
      distinct,
      region: regionOf(body.region),
    });
    return ok(r);
  } catch (e) {
    return handleError(e);
  }
}
