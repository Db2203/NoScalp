import { createHmac } from "node:crypto";
import { v4 as uuidv4, v5 as uuidv5 } from "uuid";

/**
 * Deterministic ID + identity helpers.
 *
 * The whole anti-bot / exactly-once design rests on one trick: encode every
 * "this must be unique" rule into a DETERMINISTIC primary key derived from its
 * natural key (UUIDv5). A duplicate then computes the *same* UUID and collides
 * cleanly on the primary-key index (`ON CONFLICT (id) DO NOTHING`) instead of
 * racing to update a shared row. Distinct entities -> distinct keys -> writes
 * spread across the keyspace, so Aurora DSQL never sees hot-row contention.
 */

// Fixed namespaces (any constant UUIDs — these never change once chosen).
const NS_ENTRY = "6f9619ff-8b86-d011-b42d-00cf4fc964ff";
const NS_SLOT = "7f9619ff-8b86-d011-b42d-00cf4fc964ff";
const NS_IDENTITY = "9f9619ff-8b86-d011-b42d-00cf4fc964ff";
const NS_ORDER = "af9619ff-8b86-d011-b42d-00cf4fc964ff";

/** One lottery entry per (drop, verified human). Duplicate => same id => no-op. */
export function entryId(dropId: string, identityHash: string): string {
  return uuidv5(`${dropId}:${identityHash}`, NS_ENTRY);
}

/** Stable identity id derived from the contact hash — no lookup needed. */
export function identityIdFor(identityHash: string): string {
  return uuidv5(identityHash, NS_IDENTITY);
}

/** One purchase "slot" per (drop, identity, slot index) — a per-user limit with no counter. */
export function slotId(dropId: string, identityId: string, slotIndex: number): string {
  return uuidv5(`${dropId}:${identityId}:${slotIndex}`, NS_SLOT);
}

/** Order id derived from the idempotency key — duplicate buy clicks collapse to one. */
export function orderIdFor(idempotencyKey: string): string {
  return uuidv5(idempotencyKey, NS_ORDER);
}

export const newId = uuidv4;

/**
 * Identity hash = HMAC(secret, normalized contact). We never store the raw
 * email/phone. Normalization defeats the cheapest multi-accounting tricks
 * (gmail dots, +aliases, casing) so a bot needs genuinely distinct inboxes.
 */
export function normalizeContact(raw: string): string {
  const v = raw.trim().toLowerCase();
  if (v.includes("@")) {
    const [local, domain] = v.split("@");
    let l = local.split("+")[0]; // drop +aliases
    if (domain === "gmail.com" || domain === "googlemail.com") {
      l = l.replace(/\./g, ""); // gmail ignores dots
    }
    return `${l}@${domain === "googlemail.com" ? "gmail.com" : domain}`;
  }
  // treat as phone: keep leading + and digits only
  const digits = v.replace(/[^\d+]/g, "");
  return digits.startsWith("+") ? digits : `+${digits}`;
}

export function identityHash(rawContact: string): string {
  const secret = process.env.EVEN_IDENTITY_SECRET || "dev-only-insecure-secret";
  return createHmac("sha256", secret)
    .update(normalizeContact(rawContact))
    .digest("hex");
}
