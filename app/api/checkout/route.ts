import Stripe from "stripe";
import { getCheckoutInfo } from "@/lib/queries";
import { ok, fail, handleError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Create a Stripe PaymentIntent for a winner's claim. The amount is taken from
 * the drop's price server-side (never from the client), and the allocation must
 * belong to the identity. Used by the embedded Payment Element; the order is
 * only finalized (claimUnit) after payment succeeds. Test mode by default.
 */
export async function POST(req: Request) {
  try {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return fail("not_configured", "payments are not configured", 503);

    const body = await req.json().catch(() => ({}));
    if (!body?.allocationId || !body?.identityId) {
      return fail("bad_request", "allocationId and identityId required");
    }

    const info = await getCheckoutInfo(String(body.allocationId), String(body.identityId));
    if (!info) return fail("not_found", "allocation not found for this identity", 404);
    if (info.state !== "reserved") return fail("already_claimed", "this allocation is already claimed", 409);
    if (new Date(info.claimCloseAt).getTime() <= Date.now()) {
      return fail("expired", "the claim window has closed", 410);
    }

    const stripe = new Stripe(key);
    const intent = await stripe.paymentIntents.create({
      amount: info.priceCents,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      metadata: {
        allocationId: String(body.allocationId),
        identityId: String(body.identityId),
        dropId: info.dropId,
        unitNo: String(info.unitNo),
      },
    });

    return ok({ clientSecret: intent.client_secret, amount: info.priceCents });
  } catch (e) {
    return handleError(e);
  }
}
