import { verifyIdentity } from "@/lib/engine";
import { ok, fail, handleError, regionOf } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// In a real build this runs after an email/SMS OTP. For the demo the OTP step is
// mocked in the UI; the uniqueness guarantee (one identity per contact) is real.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const contact = String(body?.contact ?? "").trim();
    if (!contact) return fail("bad_request", "contact required");
    if (contact.length < 3 || contact.length > 200) return fail("bad_request", "contact looks invalid");
    if (!contact.includes("@") && !/\d/.test(contact)) return fail("bad_request", "enter an email or phone number");
    const displayName = body?.displayName ? String(body.displayName).slice(0, 80) : undefined;
    const r = await verifyIdentity(contact, {
      displayName,
      deviceFp: body?.deviceFp ? String(body.deviceFp).slice(0, 200) : undefined,
      region: regionOf(body.region),
    });
    return ok(r);
  } catch (e) {
    return handleError(e);
  }
}
