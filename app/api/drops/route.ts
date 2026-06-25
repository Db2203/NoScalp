import { listDrops } from "@/lib/queries";
import { ok, handleError, regionOf } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const drops = await listDrops(regionOf(url.searchParams.get("region")));
    return ok(drops);
  } catch (e) {
    return handleError(e);
  }
}
