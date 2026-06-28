import { getDrawProof } from "@/lib/queries";
import { ok, fail, handleError, regionOf } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public: everything needed to reproduce + verify a draw in the browser. */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const dropId = url.searchParams.get("id") ?? url.searchParams.get("dropId");
    if (!dropId) return fail("bad_request", "dropId required");
    const proof = await getDrawProof(dropId, regionOf(url.searchParams.get("region")));
    return ok(proof);
  } catch (e) {
    return handleError(e);
  }
}
