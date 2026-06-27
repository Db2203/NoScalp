import { getMyEntries } from "@/lib/queries";
import { ok, fail, handleError, regionOf } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const identityId = url.searchParams.get("identityId");
    if (!identityId) return fail("bad_request", "identityId required");
    const entries = await getMyEntries(identityId, regionOf(url.searchParams.get("region")));
    return ok(entries);
  } catch (e) {
    return handleError(e);
  }
}
