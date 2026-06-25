import { getDropStats } from "@/lib/queries";
import { ok, fail, handleError, regionOf } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const dropId = url.searchParams.get("dropId");
    if (!dropId) return fail("bad_request", "dropId required");
    const region = regionOf(url.searchParams.get("region"));
    const stats = await getDropStats(dropId, region);
    return ok(stats);
  } catch (e) {
    return handleError(e);
  }
}
