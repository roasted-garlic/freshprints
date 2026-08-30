import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { UpcomingShow } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.types";
import { Timestamp } from "firebase/firestore";

import { buildShowQueueDeepLinkPath } from "./buildShowQueueDeepLinkPath";

function buildShow(overrides: Partial<UpcomingShow> = {}): UpcomingShow {
  return {
    id: "show-1",
    title: "Friday Night DTF",
    source: "whatnot",
    status: "scheduled",
    syncStatus: "idle",
    productionStatus: "completed",
    scheduledStartAt: Timestamp.fromMillis(Date.UTC(2026, 7, 31, 20, 30)),
    createdAt: Timestamp.fromMillis(1_700_000_000_000),
    updatedAt: Timestamp.fromMillis(1_700_000_000_000),
    ...overrides,
  } as UpcomingShow;
}

describe("buildShowQueueDeepLinkPath", () => {
  it("links to show queue with request highlight for past printed shows", () => {
    const path = buildShowQueueDeepLinkPath({
      showId: "show-1",
      printRequestId: "pr-1",
      show: buildShow(),
      now: new Date(Date.UTC(2026, 8, 1, 12, 0)),
    });

    assert.match(path, /^\/show-queue\?/);
    assert.match(path, /showId=show-1/);
    assert.match(path, /requestId=pr-1/);
    assert.match(path, /tab=past/);
  });

  it("routes staff gang sheet shows to internal gang sheets surface", () => {
    const path = buildShowQueueDeepLinkPath({
      showId: "sheet-1",
      printRequestId: "pr-2",
      show: buildShow({
        id: "sheet-1",
        source: "staff_gang_sheet",
        productionStatus: "printing",
      }),
      now: new Date(Date.UTC(2026, 8, 1, 12, 0)),
    });

    assert.match(path, /^\/internal-gang-sheets\?/);
    assert.match(path, /showId=sheet-1/);
    assert.match(path, /requestId=pr-2/);
    assert.match(path, /tab=current/);
  });
});
