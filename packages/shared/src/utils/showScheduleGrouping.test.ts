import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { UpcomingShow } from "../types/upcomingShow/upcomingShow.types";
import {
  canAllocatePrintRequestToShow,
  canStartShowPrinting,
  filterShowsAvailableForAllocation,
  filterShowsByScheduleTab,
  getShowScheduleTab,
  isPastScheduledShow,
  isStalePastPrintingWhatnotShow,
  resolveScheduleTabForStillExistingSelection,
  resolveVisibleShowSelection,
} from "./showScheduleGrouping";

function buildShow(overrides: Partial<UpcomingShow> = {}): UpcomingShow {
  return {
    id: "show-1",
    source: "whatnot",
    whatnotShowId: "wn-100",
    status: "scheduled",
    syncStatus: "idle",
    isArchived: false,
    productionStatus: "open",
    maxQuantityOverridden: false,
    allocatedQuantity: 0,
    accumulatedPrintMs: 0,
    createdAt: { toDate: () => new Date("2026-01-01") } as UpcomingShow["createdAt"],
    updatedAt: { toDate: () => new Date("2026-01-01") } as UpcomingShow["updatedAt"],
    ...overrides,
  };
}

function timestamp(iso: string) {
  const millis = new Date(iso).getTime();
  return { toMillis: () => millis, toDate: () => new Date(millis) } as UpcomingShow["scheduledStartAt"];
}

describe("getShowScheduleTab", () => {
  const now = new Date("2026-07-05T12:00:00Z");

  it("classifies a future show as upcoming", () => {
    const show = buildShow({ scheduledStartAt: timestamp("2026-07-05T12:00:01Z") });
    assert.equal(getShowScheduleTab(show, now), "upcoming");
  });

  it("classifies a show exactly at now as past", () => {
    const show = buildShow({ scheduledStartAt: timestamp("2026-07-05T12:00:00Z") });
    assert.equal(getShowScheduleTab(show, now), "past");
  });

  it("classifies a show in the past as past", () => {
    const show = buildShow({ scheduledStartAt: timestamp("2026-07-05T11:59:59Z") });
    assert.equal(getShowScheduleTab(show, now), "past");
  });

  it("treats a show with no schedule as upcoming", () => {
    const show = buildShow({ scheduledStartAt: undefined });
    assert.equal(getShowScheduleTab(show, now), "upcoming");
  });
});

describe("filterShowsByScheduleTab", () => {
  it("splits shows into upcoming and past groups", () => {
    const now = new Date("2026-07-05T12:00:00Z");
    const future = buildShow({ id: "future", scheduledStartAt: timestamp("2026-08-01T00:00:00Z") });
    const past = buildShow({ id: "past", scheduledStartAt: timestamp("2026-06-01T00:00:00Z") });

    assert.deepEqual(filterShowsByScheduleTab([future, past], "upcoming", now).map((s) => s.id), ["future"]);
    assert.deepEqual(filterShowsByScheduleTab([future, past], "past", now).map((s) => s.id), ["past"]);
  });
});

describe("isPastScheduledShow", () => {
  const now = new Date("2026-07-07T12:00:00Z");

  it("is true for past shows", () => {
    const show = buildShow({ scheduledStartAt: timestamp("2026-06-01T00:00:00Z") });
    assert.equal(isPastScheduledShow(show, now), true);
  });

  it("is false for upcoming shows", () => {
    const show = buildShow({ scheduledStartAt: timestamp("2026-08-01T00:00:00Z") });
    assert.equal(isPastScheduledShow(show, now), false);
  });
});

describe("canStartShowPrinting", () => {
  const now = new Date("2026-07-07T12:00:00Z");

  it("allows starting on upcoming shows", () => {
    const show = buildShow({ scheduledStartAt: timestamp("2026-08-01T00:00:00Z") });
    assert.equal(canStartShowPrinting(show, now), true);
  });

  it("blocks starting on past shows", () => {
    const show = buildShow({ scheduledStartAt: timestamp("2026-06-01T00:00:00Z") });
    assert.equal(canStartShowPrinting(show, now), false);
  });
});

describe("canAllocatePrintRequestToShow", () => {
  const now = new Date("2026-07-07T12:00:00Z");

  it("allows allocation to upcoming shows", () => {
    const show = buildShow({ scheduledStartAt: timestamp("2026-08-01T00:00:00Z") });
    assert.equal(canAllocatePrintRequestToShow(show, now), true);
  });

  it("blocks allocation to past shows", () => {
    const show = buildShow({ scheduledStartAt: timestamp("2026-06-01T00:00:00Z") });
    assert.equal(canAllocatePrintRequestToShow(show, now), false);
  });
});

describe("filterShowsAvailableForAllocation", () => {
  it("excludes past shows from allocation pickers", () => {
    const now = new Date("2026-07-05T12:00:00Z");
    const future = buildShow({ id: "future", scheduledStartAt: timestamp("2026-08-01T00:00:00Z") });
    const past = buildShow({ id: "past", scheduledStartAt: timestamp("2026-06-01T00:00:00Z") });
    const unscheduled = buildShow({ id: "unscheduled", scheduledStartAt: undefined });

    assert.deepEqual(filterShowsAvailableForAllocation([future, past, unscheduled], now).map((s) => s.id), [
      "future",
      "unscheduled",
    ]);
  });
});

describe("resolveVisibleShowSelection", () => {
  it("keeps the current selection when it remains visible", () => {
    const visibleShows = [buildShow({ id: "show-1" }), buildShow({ id: "show-2" })];

    assert.equal(resolveVisibleShowSelection(visibleShows, "show-2"), "show-2");
  });

  it("falls back to the first visible show when the selection is no longer visible", () => {
    const visibleShows = [buildShow({ id: "show-1" }), buildShow({ id: "show-2" })];

    assert.equal(resolveVisibleShowSelection(visibleShows, "show-3"), "show-1");
  });

  it("clears the selection when the active tab has no shows", () => {
    assert.equal(resolveVisibleShowSelection([], "show-1"), null);
  });
});

describe("resolveScheduleTabForStillExistingSelection (Plan Section 29.4)", () => {
  const now = new Date("2026-07-05T12:00:00Z");

  it("returns null when the selection is still classified in the active tab", () => {
    const shows = [buildShow({ id: "show-1", scheduledStartAt: timestamp("2026-08-01T00:00:00Z") })];
    assert.equal(
      resolveScheduleTabForStillExistingSelection(shows, "show-1", "upcoming", now),
      null,
    );
  });

  it("returns the show's new tab when it reclassified out of the active tab (the Finish scenario)", () => {
    // Models exactly the owner's repro: a show scheduled for earlier today was "upcoming" when
    // selected/Finished, but by the time the post-Finish refresh's `now` is evaluated, its
    // scheduled time has passed — it now classifies as "past" while the active tab is still
    // "upcoming".
    const shows = [buildShow({ id: "show-1", scheduledStartAt: timestamp("2026-07-05T10:00:00Z") })];
    assert.equal(
      resolveScheduleTabForStillExistingSelection(shows, "show-1", "upcoming", now),
      "past",
    );
  });

  it("returns null when the selected show no longer exists at all (genuinely gone, not just reclassified)", () => {
    const shows = [buildShow({ id: "show-2", scheduledStartAt: timestamp("2026-08-01T00:00:00Z") })];
    assert.equal(
      resolveScheduleTabForStillExistingSelection(shows, "show-1", "upcoming", now),
      null,
    );
  });

  it("returns null when there is no current selection", () => {
    const shows = [buildShow({ id: "show-1" })];
    assert.equal(
      resolveScheduleTabForStillExistingSelection(shows, null, "upcoming", now),
      null,
    );
  });

  it("does not resurrect a selection the owner genuinely navigated away from — only reclassification is handled here, not general fallback", () => {
    // This function only answers "did THIS show's own tab change" — it must not be used to
    // override an explicit navigation the owner performed via handleScheduleTabChange/
    // handleSelectShow, which set selectedShowId/activeScheduleTab together and are unaffected by
    // this function's logic (that scenario is not modeled here since this function has no
    // knowledge of "explicit navigation" at all — it exists only to detect automatic
    // reclassification, and the calling component is responsible for not invoking it after an
    // explicit selection change already updated both selectedShowId and activeScheduleTab
    // consistently).
    const shows = [buildShow({ id: "show-1", scheduledStartAt: timestamp("2026-08-01T00:00:00Z") })];
    assert.equal(
      resolveScheduleTabForStillExistingSelection(shows, "show-1", "upcoming", now),
      null,
      "no reclassification occurred, so this must be a no-op regardless of navigation history",
    );
  });
});

describe("isStalePastPrintingWhatnotShow", () => {
  const now = new Date("2026-07-05T12:00:00Z");

  it("is false for an upcoming Printing Whatnot show", () => {
    const show = buildShow({
      productionStatus: "printing",
      scheduledStartAt: timestamp("2026-07-05T12:00:01Z"),
    });
    assert.equal(isStalePastPrintingWhatnotShow(show, now), false);
  });

  it("is true at the exact Past boundary when still Printing", () => {
    const show = buildShow({
      productionStatus: "printing",
      scheduledStartAt: timestamp("2026-07-05T12:00:00Z"),
    });
    assert.equal(isStalePastPrintingWhatnotShow(show, now), true);
  });

  it("is false for Past Open, completed, canceled, archived, and Staff Gang Sheets", () => {
    const past = timestamp("2026-07-05T11:00:00Z");
    assert.equal(
      isStalePastPrintingWhatnotShow(buildShow({ productionStatus: "open", scheduledStartAt: past }), now),
      false,
    );
    assert.equal(
      isStalePastPrintingWhatnotShow(
        buildShow({ productionStatus: "completed", scheduledStartAt: past }),
        now,
      ),
      false,
    );
    assert.equal(
      isStalePastPrintingWhatnotShow(
        buildShow({ productionStatus: "canceled", scheduledStartAt: past }),
        now,
      ),
      false,
    );
    assert.equal(
      isStalePastPrintingWhatnotShow(
        buildShow({ productionStatus: "archived", scheduledStartAt: past }),
        now,
      ),
      false,
    );
    assert.equal(
      isStalePastPrintingWhatnotShow(
        buildShow({
          source: "staff_gang_sheet",
          productionStatus: "printing",
          scheduledStartAt: past,
        }),
        now,
      ),
      false,
    );
  });
});
