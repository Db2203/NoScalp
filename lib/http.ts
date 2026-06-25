import { NextResponse } from "next/server";
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
    const status = { not_found: 404, closed: 409, expired: 410, limit: 409, bad_request: 400 }[err.code] ?? 400;
    return fail(err.code, err.message, status);
  }
  console.error(err);
  return fail("internal", (err as Error)?.message ?? "internal error", 500);
}

export function regionOf(value: string | null | undefined): RegionKey {
  return value === "B" ? "B" : "A";
}
