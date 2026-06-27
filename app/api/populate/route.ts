import { seedHumans } from "@/lib/engine";
import { ok, fail, handleError, regionOf, requireAdmin } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Demo-only: register a pool of genuine verified fans before the flood + draw. */
export async function POST(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    const body = await req.json().catch(() => ({}));
    if (!body?.dropId) return fail("bad_request", "dropId required");
    const count = Math.min(Math.max(Number(body.humans) || 9000, 0), 20000);
    const r = await seedHumans({ dropId: String(body.dropId), count, region: regionOf(body.region) });
    return ok(r);
  } catch (e) {
    return handleError(e);
  }
}
