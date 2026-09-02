import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { UpcomingShow } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.types";
import {
  sortPastShowsForDisplay,
  sortStaffGangSheetHistoryForDisplay,
  sortUpcomingShowsForDisplay,
} from "./upcomingShowListSort";

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

function buildStaffHistoryShow(overrides: Partial<UpcomingShow> = {}): UpcomingShow {
  return buildShow({
    source: "staff_gang_sheet",
    whatnotShowId: undefined,
    productionStatus: "completed",
    staffGangSheetCycleNumber: 1,
    ...overrides,
  });
}

function timestamp(iso: string) {
  const millis = new Date(iso).getTime();
  return { toMillis: () => millis, toDate: () => new Date(millis) } as UpcomingShow["scheduledStartAt"];
}

describe("sortUpcomingShowsForDisplay", () => {
  it("includes a show with no scheduledStartAt in the result, unlike a Firestore orderBy query", () => {
    const showWithoutSchedule = buildShow({ id: "show-no-schedule", scheduledStartAt: undefined });
    const showWithSchedule = buildShow({ id: "show-with-schedule", scheduledStartAt: timestamp("2026-08-01T00:00:00Z") });

    const result = sortUpcomingShowsForDisplay([showWithSchedule, showWithoutSchedule]);

    assert.equal(result.length, 2);
    assert.ok(result.some((show) => show.id === "show-no-schedule"));
  });

  it("sorts shows with a schedule ascending by scheduledStartAt", () => {
    const later = buildShow({ id: "later", scheduledStartAt: timestamp("2026-09-01T00:00:00Z") });
    const earlier = buildShow({ id: "earlier", scheduledStartAt: timestamp("2026-08-01T00:00:00Z") });

    const result = sortUpcomingShowsForDisplay([later, earlier]);

    assert.deepEqual(result.map((show) => show.id), ["earlier", "later"]);
  });

  it("sorts shows missing a schedule after all scheduled shows", () => {
    const scheduled = buildShow({ id: "scheduled", scheduledStartAt: timestamp("2026-08-01T00:00:00Z") });
    const unscheduled = buildShow({ id: "unscheduled", scheduledStartAt: undefined });

    const result = sortUpcomingShowsForDisplay([unscheduled, scheduled]);

    assert.deepEqual(result.map((show) => show.id), ["scheduled", "unscheduled"]);
  });

  it("falls back to a stable ID sort when multiple shows have no schedule", () => {
    const showB = buildShow({ id: "show-b", scheduledStartAt: undefined });
    const showA = buildShow({ id: "show-a", scheduledStartAt: undefined });

    const result = sortUpcomingShowsForDisplay([showB, showA]);

    assert.deepEqual(result.map((show) => show.id), ["show-a", "show-b"]);
  });

  it("does not mutate the input array", () => {
    const earlier = buildShow({ id: "earlier", scheduledStartAt: timestamp("2026-08-01T00:00:00Z") });
    const later = buildShow({ id: "later", scheduledStartAt: timestamp("2026-09-01T00:00:00Z") });
    const input = [later, earlier];

    sortUpcomingShowsForDisplay(input);

    assert.deepEqual(input.map((show) => show.id), ["later", "earlier"]);
  });
});

describe("sortPastShowsForDisplay", () => {
  it("sorts shows with a schedule descending by scheduledStartAt", () => {
    const later = buildShow({ id: "later", scheduledStartAt: timestamp("2026-09-01T00:00:00Z") });
    const earlier = buildShow({ id: "earlier", scheduledStartAt: timestamp("2026-08-01T00:00:00Z") });

    const result = sortPastShowsForDisplay([earlier, later]);

    assert.deepEqual(result.map((show) => show.id), ["later", "earlier"]);
  });

  it("sorts shows missing a schedule after all scheduled shows", () => {
    const scheduled = buildShow({ id: "scheduled", scheduledStartAt: timestamp("2026-08-01T00:00:00Z") });
    const unscheduled = buildShow({ id: "unscheduled", scheduledStartAt: undefined });

    const result = sortPastShowsForDisplay([unscheduled, scheduled]);

    assert.deepEqual(result.map((show) => show.id), ["scheduled", "unscheduled"]);
  });

  it("does not mutate the input array", () => {
    const earlier = buildShow({ id: "earlier", scheduledStartAt: timestamp("2026-08-01T00:00:00Z") });
    const later = buildShow({ id: "later", scheduledStartAt: timestamp("2026-09-01T00:00:00Z") });
    const input = [earlier, later];

    sortPastShowsForDisplay(input);

    assert.deepEqual(input.map((show) => show.id), ["earlier", "later"]);
  });
});

describe("sortStaffGangSheetHistoryForDisplay", () => {
  it("sorts three history records newest printFinishedAt first", () => {
    const cycle3 = buildStaffHistoryShow({
      id: "c3",
      staffGangSheetCycleNumber: 3,
      printFinishedAt: timestamp("2026-08-01T00:00:00Z"),
    });
    const cycle5 = buildStaffHistoryShow({
      id: "c5",
      staffGangSheetCycleNumber: 5,
      printFinishedAt: timestamp("2026-08-03T00:00:00Z"),
    });
    const cycle4 = buildStaffHistoryShow({
      id: "c4",
      staffGangSheetCycleNumber: 4,
      printFinishedAt: timestamp("2026-08-02T00:00:00Z"),
    });

    const result = sortStaffGangSheetHistoryForDisplay([cycle3, cycle5, cycle4]);

    assert.deepEqual(result.map((show) => show.id), ["c5", "c4", "c3"]);
  });

  it("sorts missing printFinishedAt after finished records", () => {
    const finished = buildStaffHistoryShow({
      id: "finished",
      staffGangSheetCycleNumber: 2,
      printFinishedAt: timestamp("2026-08-01T00:00:00Z"),
    });
    const unfinished = buildStaffHistoryShow({
      id: "unfinished",
      staffGangSheetCycleNumber: 9,
      printFinishedAt: undefined,
      productionStatus: "canceled",
    });

    const result = sortStaffGangSheetHistoryForDisplay([unfinished, finished]);

    assert.deepEqual(result.map((show) => show.id), ["finished", "unfinished"]);
  });

  it("uses cycle DESC then id when printFinishedAt ties", () => {
    const finish = timestamp("2026-08-01T12:00:00Z");
    const cycle4 = buildStaffHistoryShow({
      id: "id-a",
      staffGangSheetCycleNumber: 4,
      printFinishedAt: finish,
    });
    const cycle5 = buildStaffHistoryShow({
      id: "id-b",
      staffGangSheetCycleNumber: 5,
      printFinishedAt: finish,
    });

    const result = sortStaffGangSheetHistoryForDisplay([cycle4, cycle5]);

    assert.deepEqual(result.map((show) => show.id), ["id-b", "id-a"]);
  });

  it("uses cycle DESC then id when both lack printFinishedAt", () => {
    const cycle2 = buildStaffHistoryShow({
      id: "z-id",
      staffGangSheetCycleNumber: 2,
      printFinishedAt: undefined,
    });
    const cycle4 = buildStaffHistoryShow({
      id: "a-id",
      staffGangSheetCycleNumber: 4,
      printFinishedAt: undefined,
    });

    const result = sortStaffGangSheetHistoryForDisplay([cycle2, cycle4]);

    assert.deepEqual(result.map((show) => show.id), ["a-id", "z-id"]);
  });

  it("returns empty history unchanged", () => {
    assert.deepEqual(sortStaffGangSheetHistoryForDisplay([]), []);
  });

  it("returns a single history item", () => {
    const only = buildStaffHistoryShow({
      id: "only",
      staffGangSheetCycleNumber: 1,
      printFinishedAt: timestamp("2026-08-01T00:00:00Z"),
    });

    assert.deepEqual(
      sortStaffGangSheetHistoryForDisplay([only]).map((show) => show.id),
      ["only"],
    );
  });

  it("does not mutate the input array", () => {
    const older = buildStaffHistoryShow({
      id: "older",
      staffGangSheetCycleNumber: 1,
      printFinishedAt: timestamp("2026-08-01T00:00:00Z"),
    });
    const newer = buildStaffHistoryShow({
      id: "newer",
      staffGangSheetCycleNumber: 2,
      printFinishedAt: timestamp("2026-08-02T00:00:00Z"),
    });
    const input = [older, newer];

    sortStaffGangSheetHistoryForDisplay(input);

    assert.deepEqual(input.map((show) => show.id), ["older", "newer"]);
  });
});

describe("UpcomingShowsPage staff history wiring contract", () => {
  const pageSource = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../pages/UpcomingShowsPage.tsx"),
    "utf8",
  );

  it("applies history sort only to Internal Gang Sheet History, not Current", () => {
    assert.match(pageSource, /sortStaffGangSheetHistoryForDisplay/);
    assert.match(
      pageSource,
      /return \{ current, history: sortStaffGangSheetHistoryForDisplay\(history\) \}/,
    );
    assert.doesNotMatch(
      pageSource,
      /sortStaffGangSheetHistoryForDisplay\(current\)/,
    );
  });

  it("keeps Past Shows on sortPastShowsForDisplay and does not sort Upcoming with history helper", () => {
    assert.match(pageSource, /past: sortPastShowsForDisplay\(partitioned\.past\)/);
    assert.match(pageSource, /upcoming: partitioned\.upcoming/);
    assert.doesNotMatch(pageSource, /sortStaffGangSheetHistoryForDisplay\(partitioned/);
  });
});
