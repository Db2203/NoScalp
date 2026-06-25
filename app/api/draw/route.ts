import { runDraw } from "@/lib/engine";
import { ok, fail, handleError, regionOf } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.dropId) return fail("bad_request", "dropId required");
    const r = await runDraw({ dropId: String(body.dropId), region: regionOf(body.region) });
    return ok(r);
  } catch (e) {
    return handleError(e);
  }
}
