import { floodBots } from "@/lib/engine";
import { ok, fail, handleError, regionOf } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.dropId) return fail("bad_request", "dropId required");
    const attempts = Math.min(Math.max(Number(body.attempts) || 5000, 1), 50000);
    const r = await floodBots({
      dropId: String(body.dropId),
      attempts,
      distinct: body.distinct ? Number(body.distinct) : undefined,
      region: regionOf(body.region),
    });
    return ok(r);
  } catch (e) {
    return handleError(e);
  }
}
