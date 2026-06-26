// Tiny fetch helpers for client components.
export async function jpost<T = unknown>(
  path: string,
  body: unknown,
  headers?: Record<string, string>,
): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `request failed (${res.status})`);
  return data as T;
}

export async function jget<T = unknown>(path: string, headers?: Record<string, string>): Promise<T> {
  const res = await fetch(path, { cache: "no-store", headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `request failed (${res.status})`);
  return data as T;
}
