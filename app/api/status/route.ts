import { getIdentityStatus } from "@/lib/queries";
import { ok, fail, handleError, regionOf } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const dropId = url.searchParams.get("dropId");
    const identityId = url.searchParams.get("identityId");
    if (!dropId || !identityId) return fail("bad_request", "dropId and identityId required");
    const status = await getIdentityStatus(dropId, identityId, regionOf(url.searchParams.get("region")));
    return ok(status);
  } catch (e) {
    return handleError(e);
  }
}
