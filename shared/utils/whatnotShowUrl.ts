const WHATNOT_LIVE_SHOW_ID_PATTERN = /\/live\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:[/?#]|$)/i;

/** Studio always attributes Whatnot links with this source. The customer Portal will use a different value. */
const STUDIO_REFERRING_SOURCE = "fpStudio";

export interface ParsedWhatnotShowUrl {
  whatnotShowId: string;
  whatnotUrl: string;
}

/**
 * Parses a stable Whatnot show ID from a pasted Whatnot live show URL, e.g.
 * `https://www.whatnot.com/live/bf834262-79ee-4c70-8eb9-9da3eb5fe91b?referringSource=profile`
 * -> `bf834262-79ee-4c70-8eb9-9da3eb5fe91b`. Returns undefined for anything that doesn't
 * match, including blank input, non-Whatnot URLs, or a `/live/` segment without a UUID.
 * The returned `whatnotUrl` always carries `referringSource=fpStudio`, overwriting whatever
 * source was present in the pasted URL, since links saved from Studio should always attribute
 * back to Studio.
 */
export function parseWhatnotShowUrl(rawInput: string): ParsedWhatnotShowUrl | undefined {
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

  if (!/(^|\.)whatnot\.com$/i.test(parsedUrl.hostname)) {
    return undefined;
  }

  const match = WHATNOT_LIVE_SHOW_ID_PATTERN.exec(parsedUrl.pathname);

  if (!match) {
    return undefined;
  }

  parsedUrl.searchParams.set("referringSource", STUDIO_REFERRING_SOURCE);

  return {
    whatnotShowId: match[1].toLowerCase(),
    whatnotUrl: parsedUrl.toString(),
  };
}
