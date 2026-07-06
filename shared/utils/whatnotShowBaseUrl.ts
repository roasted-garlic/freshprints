const WHATNOT_SHOW_BASE_URL_PATH_PATTERN = /^\/user\/([A-Za-z0-9_.-]+)\/shows\/?$/;

export interface ParsedWhatnotShowBaseUrl {
  normalizedUrl: string;
  username: string;
}

/**
 * Validates a staff-configured Whatnot show-list base URL against a strict allowlist, since this
 * URL is fetched server-side (unlike `parseWhatnotShowUrl()`'s single-show URL, which is only ever
 * opened in a window). Returns undefined — never throws — for anything outside
 * `https://www.whatnot.com/user/<username>/shows`: wrong scheme, wrong/sub- host, extra path
 * segments, a query string, a fragment, or a non-default port. This is intentionally stricter than
 * `parseWhatnotShowUrl()` (which allows any `*.whatnot.com` subdomain) because this URL becomes a
 * fetch target, not just a link — a narrower allowlist here reduces SSRF/redirect surface.
 */
export function parseWhatnotShowBaseUrl(rawInput: string): ParsedWhatnotShowBaseUrl | undefined {
  const trimmedUrl = rawInput.trim();

  if (!trimmedUrl) {
    return undefined;
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(trimmedUrl);
  } catch {
    return undefined;
  }

  if (parsedUrl.protocol !== "https:") {
    return undefined;
  }

  if (parsedUrl.hostname !== "www.whatnot.com") {
    return undefined;
  }

  if (parsedUrl.port !== "") {
    return undefined;
  }

  if (parsedUrl.search !== "" || parsedUrl.hash !== "") {
    return undefined;
  }

  const match = WHATNOT_SHOW_BASE_URL_PATH_PATTERN.exec(parsedUrl.pathname);

  if (!match) {
    return undefined;
  }

  return {
    normalizedUrl: `https://www.whatnot.com/user/${match[1]}/shows`,
    username: match[1],
  };
}
