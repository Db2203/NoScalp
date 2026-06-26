import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import type { RegionKey } from "./db/pools";
import { EngineError } from "./engine";

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(code: string, message: string, status = 400) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** Map an unknown thrown value to a tidy JSON error response. */
export function handleError(err: unknown) {
  if (err instanceof EngineError) {
    const status =
      { not_found: 404, closed: 409, expired: 410, limit: 409, bad_request: 400, unauthorized: 401 }[err.code] ?? 400;
    return fail(err.code, err.message, status);
  }
  // Log the detail server-side, but never leak internal/DB error text to clients.
  console.error(err);
  return fail("internal", "internal error", 500);
}

export function regionOf(value: string | null | undefined): RegionKey {
  return value === "B" ? "B" : "A";
}

/**
 * Guard for state-changing/admin routes (draw, flood, reset, consistency probe).
 * If NOSCALP_ADMIN_TOKEN is set, callers must send a matching `x-admin-token`
 * header. If it's unset, the route is open — fine for local dev, but set the
 * token on any public deployment. Returns a response to short-circuit, or null.
 */
export function requireAdmin(req: Request): NextResponse | null {
  const expected = process.env.NOSCALP_ADMIN_TOKEN;
  if (!expected) return null;
  const provided = req.headers.get("x-admin-token") ?? "";
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length === b.length && timingSafeEqual(a, b)) return null;
  return fail("unauthorized", "admin token required", 401);
}
