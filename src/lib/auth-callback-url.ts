export function resolveAuthCallbackUrl(
  callbackUrlParam: string | null,
  currentOrigin: string
): string {
  if (!callbackUrlParam) return `${currentOrigin}/`;
  const normalized = callbackUrlParam.trim();

  const isRelativePath = normalized.startsWith("/");
  const isAbsoluteHttpUrl = /^https?:\/\//i.test(normalized);
  if (!isRelativePath && !isAbsoluteHttpUrl) return `${currentOrigin}/`;

  try {
    const parsed = new URL(normalized, currentOrigin);
    if (parsed.origin !== currentOrigin) return `${currentOrigin}/`;

    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    if (!path.startsWith("/") || path.startsWith("/auth/signin")) {
      return `${currentOrigin}/`;
    }

    return `${currentOrigin}${path}`;
  } catch {
    return `${currentOrigin}/`;
  }
}
