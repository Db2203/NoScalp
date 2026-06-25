import { getDrop } from "@/lib/queries";
import { ok, fail, handleError, regionOf } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return fail("bad_request", "id required");
    const drop = await getDrop(id, regionOf(url.searchParams.get("region")));
    if (!drop) return fail("not_found", "drop not found", 404);
    return ok(drop);
  } catch (e) {
    return handleError(e);
  }
}
