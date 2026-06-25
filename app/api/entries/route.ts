import { registerEntry } from "@/lib/engine";
import { ok, fail, handleError, regionOf } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.dropId) return fail("bad_request", "dropId required");
    if (!body?.identityHash && !body?.contact) return fail("bad_request", "identityHash or contact required");
    const r = await registerEntry({
      dropId: String(body.dropId),
      identityHash: body.identityHash,
      contact: body.contact,
      region: regionOf(body.region),
      source: body.source === "bot" ? "bot" : "human",
      displayName: body.displayName,
      deviceFp: body.deviceFp,
    });
    return ok(r);
  } catch (e) {
    return handleError(e);
  }
}
