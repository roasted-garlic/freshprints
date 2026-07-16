const ETSY_LISTING_HOSTS = new Set(["www.etsy.com", "etsy.com"]);

/**
 * Validates that a listing URL is an official Etsy listing URL.
 * Returns the sanitized absolute URL or null if invalid.
 */
export function sanitizeEtsyListingUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") {
      return null;
    }
    if (!ETSY_LISTING_HOSTS.has(url.hostname)) {
      return null;
    }
    // Typical path: /listing/{id}/...
    if (!url.pathname.includes("/listing/")) {
      return null;
    }
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Validates an official Etsy browse URL for Portal popups: listing or search pages only.
 */
export function sanitizeEtsyBrowseUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") {
      return null;
    }
    if (!ETSY_LISTING_HOSTS.has(url.hostname)) {
      return null;
    }

    const path = url.pathname;
    const isListing = path.includes("/listing/");
    const isSearch = path === "/search" || path.startsWith("/search/");
    if (!isListing && !isSearch) {
      return null;
    }

    url.hash = "";
    url.username = "";
    url.password = "";
    return url.toString();
  } catch {
    return null;
  }
}
