/**
 * Safe JSON parsing for stored/DB stringified data.
 * Malformed or unexpected data can crash JSON.parse(); these helpers return fallbacks instead.
 */

export function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (raw == null || typeof raw !== "string") return fallback;
  try {
    const out = JSON.parse(raw);
    return out as T;
  } catch {
    return fallback;
  }
}

export function parseJsonArray<T>(raw: string | null | undefined): T[] {
  const out = parseJson<unknown>(raw, null);
  return Array.isArray(out) ? (out as T[]) : [];
}

export function parseJsonObject<T extends Record<string, unknown>>(
  raw: string | null | undefined,
  fallback: T
): T {
  const out = parseJson<unknown>(raw, null);
  return out != null && typeof out === "object" && !Array.isArray(out)
    ? (out as T)
    : fallback;
}
