import { getAuditLog } from "@/lib/queries";
import { ok, fail, handleError, regionOf } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const dropId = url.searchParams.get("dropId");
    if (!dropId) return fail("bad_request", "dropId required");
    const limit = Math.min(Number(url.searchParams.get("limit")) || 40, 200);
    const rows = await getAuditLog(dropId, regionOf(url.searchParams.get("region")), limit);
    return ok(rows);
  } catch (e) {
    return handleError(e);
  }
}
