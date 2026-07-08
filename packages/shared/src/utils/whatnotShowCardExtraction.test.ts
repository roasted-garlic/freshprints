import assert from "node:assert/strict";
import { test } from "node:test";

import {
  extractWhatnotShowCardCandidate,
  type WhatnotCardLikeAnchor,
  type WhatnotCardLikeElement,
  type WhatnotCardLikeSection,
} from "./whatnotShowCardExtraction";

function mockElement(attributes: Record<string, string>, textContent: string): WhatnotCardLikeElement {
  return {
    getAttribute: (name: string) => attributes[name] ?? null,
    querySelector: () => null,
    textContent,
  };
}

/**
 * Builds a mock card mirroring the real Whatnot markup structure: two separate `/live/<id>`
 * anchors (a thumbnail-wrapping anchor with no `<strong>`, and a title-wrapping anchor with one),
 * plus a `.absolute.left-3.top-3` date badge nested inside the thumbnail anchor — exactly as
 * captured in the pasted `whatnot_show_queue.txt` sample.
 */
function mockLivestreamCard(options: {
  liveId: string;
  titleAttr: string;
  titleText?: string;
  dateBadgeText: string;
}): WhatnotCardLikeSection {
  const href = `https://www.whatnot.com/live/${options.liveId}?referringSource=profile`;
  const dateBadgeEl = mockElement({}, options.dateBadgeText);

  const thumbnailAnchor: WhatnotCardLikeAnchor = {
    href,
    getAttribute: () => null,
    querySelector: (selector: string) => {
      if (selector === ".absolute.left-3.top-3") return dateBadgeEl;
      return null;
    },
    textContent: null,
  };

  const titleEl = mockElement({ title: options.titleAttr }, options.titleText ?? options.titleAttr);

  const titleAnchor: WhatnotCardLikeAnchor = {
    href,
    getAttribute: () => null,
    querySelector: (selector: string) => (selector === "strong" ? titleEl : null),
    textContent: null,
  };

  return {
    querySelector: (selector: string) => {
      if (selector === ".absolute.left-3.top-3") return dateBadgeEl;
      return null;
    },
    querySelectorAll: (selector: string) => {
      if (selector === 'a[href^="/live/"]') return [thumbnailAnchor, titleAnchor];
      return [];
    },
  };
}

test("extractWhatnotShowCardCandidate: extracts title from the second /live/ anchor, not the thumbnail anchor", () => {
  const card = mockLivestreamCard({
    liveId: "bf834262-79ee-4c70-8eb9-9da3eb5fe91b",
    titleAttr: "🔥SUNDAY EVENING DTF Transfers | Low Starts•Bundle & Save•Press Ready 🐨🇨🇦",
    dateBadgeText: "Today 8:00 PM",
  });

  const result = extractWhatnotShowCardCandidate(card);

  assert.equal(result.href, "https://www.whatnot.com/live/bf834262-79ee-4c70-8eb9-9da3eb5fe91b?referringSource=profile");
  assert.equal(result.title, "🔥SUNDAY EVENING DTF Transfers | Low Starts•Bundle & Save•Press Ready 🐨🇨🇦");
  assert.equal(result.dateText, "Today 8:00 PM");
});

test("extractWhatnotShowCardCandidate: handles a 'Live · N' viewer-count badge", () => {
  const card = mockLivestreamCard({
    liveId: "bf834262-79ee-4c70-8eb9-9da3eb5fe91b",
    titleAttr: "Currently live show",
    dateBadgeText: "Live · 24",
  });

  const result = extractWhatnotShowCardCandidate(card);

  assert.equal(result.title, "Currently live show");
  assert.equal(result.dateText, "Live · 24");
});

test("extractWhatnotShowCardCandidate: handles a short weekday badge, 'Tue 8:00 PM'", () => {
  const card = mockLivestreamCard({
    liveId: "b3c1fa00-d863-4a0d-b475-85175d9395e6",
    titleAttr: "🔥 TUESDAY EVENING DTF Transfer show",
    dateBadgeText: "Tue 8:00 PM",
  });

  const result = extractWhatnotShowCardCandidate(card);

  assert.equal(result.dateText, "Tue 8:00 PM");
  assert.equal(result.title, "🔥 TUESDAY EVENING DTF Transfer show");
});

test("extractWhatnotShowCardCandidate: handles a short weekday badge, 'Sat 8:00 PM'", () => {
  const card = mockLivestreamCard({
    liveId: "67ee4237-425f-4578-ace6-e8bcd49cc913",
    titleAttr: "🔥 SATURDAY EVENING DTF Transfer show",
    dateBadgeText: "Sat 8:00 PM",
  });

  const result = extractWhatnotShowCardCandidate(card);

  assert.equal(result.dateText, "Sat 8:00 PM");
  assert.equal(result.title, "🔥 SATURDAY EVENING DTF Transfer show");
});

test("extractWhatnotShowCardCandidate: handles a full date badge, 'Sun, Jul 12, 8:00 PM'", () => {
  const card = mockLivestreamCard({
    liveId: "3ec90737-9d2b-4cfb-8d40-ac848d16f5d8",
    titleAttr: "🔥 SUNDAY EVENING DTF Transfer show",
    dateBadgeText: "Sun, Jul 12, 8:00 PM",
  });

  const result = extractWhatnotShowCardCandidate(card);

  assert.equal(result.dateText, "Sun, Jul 12, 8:00 PM");
  assert.equal(result.title, "🔥 SUNDAY EVENING DTF Transfer show");
});

test("extractWhatnotShowCardCandidate: handles a full date badge, 'Sun, Aug 2, 7:00 PM'", () => {
  const card = mockLivestreamCard({
    liveId: "ca5fe015-6945-40f6-83e1-0b06e88aae74",
    titleAttr: "🔥 SUNDAY EVENING DTF Transfer show",
    dateBadgeText: "Sun, Aug 2, 7:00 PM",
  });

  const result = extractWhatnotShowCardCandidate(card);

  assert.equal(result.dateText, "Sun, Aug 2, 7:00 PM");
  assert.equal(result.title, "🔥 SUNDAY EVENING DTF Transfer show");
});

test("extractWhatnotShowCardCandidate: falls back to href/empty title when no /live/ anchor is present", () => {
  const emptyCard: WhatnotCardLikeSection = {
    querySelector: () => null,
    querySelectorAll: () => [],
  };

  const result = extractWhatnotShowCardCandidate(emptyCard);

  assert.equal(result.href, "");
  assert.equal(result.title, "");
  assert.equal(result.dateText, "");
});
