import { verifyIdentity } from "@/lib/engine";
import { ok, fail, handleError, regionOf } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// In a real build this runs after an email/SMS OTP. For the demo the OTP step is
// mocked in the UI; the uniqueness guarantee (one identity per contact) is real.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.contact) return fail("bad_request", "contact required");
    const r = await verifyIdentity(String(body.contact), {
      displayName: body.displayName,
      deviceFp: body.deviceFp,
      region: regionOf(body.region),
    });
    return ok(r);
  } catch (e) {
    return handleError(e);
  }
}
