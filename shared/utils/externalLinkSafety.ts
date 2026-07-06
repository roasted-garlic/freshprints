const ALLOWED_EXTERNAL_LINK_PROTOCOLS = new Set(["http:", "https:"]);

/** Only http and https links may ever be opened as "external links" — no other scheme is allowed. */
export function isSafeExternalLinkUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return ALLOWED_EXTERNAL_LINK_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}
