import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { UpcomingShow } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.types";
import {
  canAllocatePrintRequestToShow,
  canStartShowPrinting,
  filterShowsAvailableForAllocation,
  filterShowsByScheduleTab,
  getShowScheduleTab,
  isPastScheduledShow,
  resolveVisibleShowSelection,
} from "./groupShowsByUpcomingPast";

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

  it("classifies a show exactly at now as past (1 second after scheduled time is past)", () => {
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

  it("allows starting on unscheduled shows", () => {
    const show = buildShow({ scheduledStartAt: undefined });
    assert.equal(canStartShowPrinting(show, now), true);
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

  it("allows allocation to unscheduled shows", () => {
    const show = buildShow({ scheduledStartAt: undefined });
    assert.equal(canAllocatePrintRequestToShow(show, now), true);
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
