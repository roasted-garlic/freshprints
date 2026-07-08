import type { RawWhatnotShowDomCandidate } from "./whatnotShowImportCandidate";

/**
 * Minimal DOM surface this module needs — deliberately narrower than `Element`/`HTMLAnchorElement`
 * so the exact same extraction logic can run both inside a real Electron `executeJavaScript()`
 * page context (where these are real DOM nodes) and in a plain Node unit test (where they're
 * lightweight mock objects), without pulling in a DOM-emulation dependency like `jsdom`.
 */
export interface WhatnotCardLikeElement {
  getAttribute(name: string): string | null;
  querySelector(selector: string): WhatnotCardLikeElement | null;
  textContent: string | null;
}

export interface WhatnotCardLikeAnchor extends WhatnotCardLikeElement {
  href: string;
}

export interface WhatnotCardLikeSection {
  querySelector(selector: string): WhatnotCardLikeElement | null;
  querySelectorAll(selector: string): WhatnotCardLikeAnchor[];
}

/**
 * Extracts one raw candidate from a single Whatnot `section[data-testid="livestream-card"]`.
 *
 * Each card renders **two** separate `/live/<id>` anchors: an earlier one wrapping only the
 * thumbnail image + the date/time badge overlay, and a later, separate one wrapping the title
 * `<strong>`. Only the second anchor has a `<strong>` inside it — assuming "the first `/live/`
 * anchor found" (as an earlier version of this extraction did) silently grabs the thumbnail
 * anchor and finds no title there, producing a blank/fallback title for every card. This function
 * explicitly searches every `/live/` anchor in the card for one containing a `<strong>`, rather
 * than assuming position.
 */
export function extractWhatnotShowCardCandidate(card: WhatnotCardLikeSection): RawWhatnotShowDomCandidate {
  const liveLinks = card.querySelectorAll('a[href^="/live/"]');

  let titleLink: WhatnotCardLikeAnchor | undefined;
  let titleEl: WhatnotCardLikeElement | null = null;

  for (const candidateLink of liveLinks) {
    const candidateTitleEl = candidateLink.querySelector("strong");
    if (candidateTitleEl) {
      titleLink = candidateLink;
      titleEl = candidateTitleEl;
      break;
    }
  }

  const link = titleLink ?? liveLinks[0];
  const href = link ? link.href : "";
  const title = titleEl ? (titleEl.getAttribute("title") || titleEl.textContent || "").trim() : "";

  const dateEl = card.querySelector(".absolute.left-3.top-3");
  const dateText = (dateEl?.textContent ?? "").trim();

  return { href, title, dateText };
}
