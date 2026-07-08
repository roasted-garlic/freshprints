import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { UpcomingShow } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.types";
import { sortUpcomingShowsForDisplay } from "./upcomingShowListSort";

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
    createdAt: { toDate: () => new Date("2026-01-01") } as UpcomingShow["createdAt"],
    updatedAt: { toDate: () => new Date("2026-01-01") } as UpcomingShow["updatedAt"],
    ...overrides,
  };
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
});
