import { claimUnit } from "@/lib/engine";
import { ok, fail, handleError, regionOf } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.allocationId || !body?.identityId) {
      return fail("bad_request", "allocationId and identityId required");
    }
    // Deriving the idempotency key from (allocation, identity) makes a double
    // click — or a retried request — resolve to the exact same order.
    const idempotencyKey = `${body.allocationId}:${body.identityId}`;
    const r = await claimUnit({
      allocationId: String(body.allocationId),
      identityId: String(body.identityId),
      idempotencyKey,
      region: regionOf(body.region),
    });
    return ok(r);
  } catch (e) {
    return handleError(e);
  }
}
