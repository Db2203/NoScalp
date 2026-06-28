"use client";

import { useState } from "react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Button } from "./ui";

const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise: Promise<Stripe | null> | null = pk ? loadStripe(pk) : null;

/**
 * Embedded Stripe Payment Element — the card form lives on our own (dark) page,
 * so there's no redirect and no hosted "TEST MODE" banner. On success the caller
 * finalizes the order via the idempotent claim. Test mode (use card 4242…).
 */
export function CheckoutPanel({
  clientSecret,
  amountLabel,
  onPaid,
  onCancel,
}: {
  clientSecret: string;
  amountLabel: string;
  onPaid: () => Promise<void> | void;
  onCancel: () => void;
}) {
  if (!stripePromise) {
    return <p className="text-sm text-warn">Payments are not configured.</p>;
  }
  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "night" } }}>
      <PayForm amountLabel={amountLabel} onPaid={onPaid} onCancel={onCancel} />
    </Elements>
  );
}

function PayForm({
  amountLabel,
  onPaid,
  onCancel,
}: {
  amountLabel: string;
  onPaid: () => Promise<void> | void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function pay() {
    if (!stripe || !elements) return;
    setBusy(true);
    setErr(null);
    const { error, paymentIntent } = await stripe.confirmPayment({ elements, redirect: "if_required" });
    if (error) {
      setErr(error.message ?? "Payment failed. Try again.");
      setBusy(false);
      return;
    }
    if (paymentIntent?.status === "succeeded") {
      await onPaid();
      return; // parent unmounts this panel on success
    }
    setErr("Payment didn't complete. Try again.");
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      <PaymentElement />
      {err && <p className="text-sm text-warn">{err}</p>}
      <div className="flex gap-2">
        <Button onClick={pay} disabled={busy || !stripe} className="w-full" size="lg">
          {busy ? "Paying…" : `Pay ${amountLabel}`}
        </Button>
        <Button onClick={onCancel} variant="secondary" disabled={busy}>
          Cancel
        </Button>
      </div>
      <p className="text-center text-[11px] text-mute">Secured by Stripe · test card 4242 4242 4242 4242</p>
    </div>
  );
}
