const PORTAL_RETURN_TO_PARAM = 'returnTo';
const PORTAL_RETURN_FALLBACK = '/';
const PORTAL_VALIDATION_ORIGIN = 'https://portal.invalid';
const AUTH_ROUTE_PATTERN = /^\/(?:login|login-required|register|complete-profile)(?:\/|$)/;

function hasControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 31 || codePoint === 127;
  });
}

function safelyDecode(value: string): string | null {
  let decoded = value;
  try {
    for (let pass = 0; pass < 2; pass += 1) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) {
        break;
      }
      decoded = next;
    }
    return decoded;
  } catch {
    return null;
  }
}

/** Accepts only a same-origin application path and falls back closed. */
export function getSafePortalReturnTo(value: string | null | undefined): string {
  if (!value || value !== value.trim()) {
    return PORTAL_RETURN_FALLBACK;
  }
  if (!value.startsWith('/') || value.startsWith('//')) {
    return PORTAL_RETURN_FALLBACK;
  }
  if (value.includes('\\') || hasControlCharacter(value)) {
    return PORTAL_RETURN_FALLBACK;
  }

  const decoded = safelyDecode(value);
  if (
    decoded == null ||
    decoded.startsWith('//') ||
    decoded.includes('\\') ||
    hasControlCharacter(decoded)
  ) {
    return PORTAL_RETURN_FALLBACK;
  }

  try {
    const parsed = new URL(value, PORTAL_VALIDATION_ORIGIN);
    if (parsed.origin !== PORTAL_VALIDATION_ORIGIN || AUTH_ROUTE_PATTERN.test(parsed.pathname)) {
      return PORTAL_RETURN_FALLBACK;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return PORTAL_RETURN_FALLBACK;
  }
}

export function getPortalReturnToFromSearch(search: string): string {
  const params = new URLSearchParams(search);
  return getSafePortalReturnTo(params.get(PORTAL_RETURN_TO_PARAM));
}

export function buildPortalAuthHref(
  route: '/login' | '/login-required' | '/complete-profile' | '/register',
  returnTo: string,
): string {
  const safeReturnTo = getSafePortalReturnTo(returnTo);
  if (safeReturnTo === PORTAL_RETURN_FALLBACK) {
    return route;
  }
  const params = new URLSearchParams({ [PORTAL_RETURN_TO_PARAM]: safeReturnTo });
  return `${route}?${params.toString()}`;
}

export function getCurrentPortalPath(location: Pick<Location, 'pathname' | 'search'>): string {
  return getSafePortalReturnTo(`${location.pathname}${location.search}`);
}

/**
 * After login / profile complete, map `/share/design/{id}` landings to the
 * catalog deep link that opens the design modal.
 */
export function resolvePortalPostAuthPath(returnTo: string): string {
  const safe = getSafePortalReturnTo(returnTo);
  try {
    const parsed = new URL(safe, PORTAL_VALIDATION_ORIGIN);
    const match = /^\/share\/design\/([^/]+)$/.exec(parsed.pathname);
    if (!match?.[1]) {
      return safe;
    }
    const designId = decodeURIComponent(match[1]).trim();
    if (!designId) {
      return safe;
    }
    const params = new URLSearchParams({ designId });
    return `/catalog?${params.toString()}`;
  } catch {
    return safe;
  }
}
