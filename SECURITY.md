# Security notes

NoScalp is a hackathon project, but the data model and core flows are written to be production-grade. This file is honest about what's hardened and what is deliberately scoped for the demo.

## Hardened

- **Parameterized SQL everywhere.** No user data is concatenated into queries. The only interpolations are fixed placeholder indices and the region literal (now a bound parameter).
- **Admin endpoints are gated.** `/api/draw`, `/api/flood`, `/api/reset`, and `/api/consistency` change state or generate load, so they require an `x-admin-token` header matching `NOSCALP_ADMIN_TOKEN` (constant-time compared). When the env var is unset the routes are open — convenient for local dev; **set the token on any public deployment.** Mission Control has a field to supply it.
- **Identity secret fail-fast.** `NOSCALP_IDENTITY_SECRET` must be set to a strong value in production; the app throws rather than fall back to the dev default, so identity hashes are never predictable in prod.
- **No internal error leakage.** Unexpected errors are logged server-side and returned to clients as a generic `internal error` (only curated, safe messages are surfaced).
- **Input bounds.** `contact`/`displayName` are length-capped and lightly validated; `flood` clamps both `attempts` and `distinct`.
- **Correctness under concurrency.** The draw is single-leader (only the transaction that flips `registration_open → drawing` allocates); allocations use deterministic ids and guarded updates so an entry can never win two units and stock can never oversell — verified by `npm run test:engine`, including a concurrent double-draw test.

## Deliberately demo-scope (what production would add)

- **OTP is mocked.** `/api/verify` issues an identity without actually sending/checking a one-time code, and the consumer flow passes the resulting `identityId`/`identityHash` from the client. In production you'd: (1) send a real email/SMS OTP, (2) verify it server-side, and (3) bind the identity to a signed, HTTP-only session cookie so state-changing calls (`/api/entries`, `/api/claim`) read identity from the session instead of trusting the request body. The *uniqueness* and *exactly-once* guarantees hold regardless; what's missing is proof-of-ownership of the contact.
- **No real payments.** "Claim" records an order at the listed price; there's no payment processor. A real build would attach Stripe (authorize-then-capture) inside the same transaction boundary.
- **No rate limiting / WAF.** Add per-IP rate limiting on `/api/verify`, `/api/entries`, `/api/claim` and a WAF in front for a public launch.

## Reporting

This is a hackathon submission; open an issue on the repo for anything you find.
