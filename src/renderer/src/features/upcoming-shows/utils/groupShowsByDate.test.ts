import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { UpcomingShow } from "../../../../../../shared/types/upcomingShow/upcomingShow.types";
import { groupShowsByDate } from "./groupShowsByDate";

function timestamp(iso: string) {
  const millis = new Date(iso).getTime();
  return { toMillis: () => millis, toDate: () => new Date(millis) } as UpcomingShow["scheduledStartAt"];
}

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

describe("groupShowsByDate", () => {
  it("groups shows scheduled on the same calendar day together", () => {
    const morning = buildShow({ id: "morning", scheduledStartAt: timestamp("2026-08-01T09:00:00") });
    const evening = buildShow({ id: "evening", scheduledStartAt: timestamp("2026-08-01T20:00:00") });

    const groups = groupShowsByDate([evening, morning]);

    assert.equal(groups.length, 1);
    assert.deepEqual(groups[0].shows.map((show) => show.id), ["morning", "evening"]);
  });

  it("orders groups by date ascending", () => {
    const later = buildShow({ id: "later", scheduledStartAt: timestamp("2026-09-01T00:00:00") });
    const earlier = buildShow({ id: "earlier", scheduledStartAt: timestamp("2026-08-01T00:00:00") });

    const groups = groupShowsByDate([later, earlier]);

    assert.deepEqual(groups.map((group) => group.shows[0].id), ["earlier", "later"]);
  });

  it("puts shows with no scheduled date in a final group", () => {
    const scheduled = buildShow({ id: "scheduled", scheduledStartAt: timestamp("2026-08-01T00:00:00") });
    const unscheduled = buildShow({ id: "unscheduled", scheduledStartAt: undefined });

    const groups = groupShowsByDate([unscheduled, scheduled]);

    assert.equal(groups.length, 2);
    assert.equal(groups[groups.length - 1].shows[0].id, "unscheduled");
    assert.equal(groups[groups.length - 1].dateLabel, "No date set");
  });

  it("returns an empty array for no shows", () => {
    assert.deepEqual(groupShowsByDate([]), []);
  });
});
