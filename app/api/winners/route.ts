import { getWinners } from "@/lib/queries";
import { ok, fail, handleError, regionOf } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The real per-unit allocations for a drawn drop (drives the live drop log). */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const dropId = url.searchParams.get("id") ?? url.searchParams.get("dropId");
    if (!dropId) return fail("bad_request", "dropId required");
    const winners = await getWinners(dropId, regionOf(url.searchParams.get("region")));
    return ok({ winners });
  } catch (e) {
    return handleError(e);
  }
}
