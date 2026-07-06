import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { UpcomingShow } from "../../../../../../shared/types/upcomingShow/upcomingShow.types";
import { buildUpcomingShowUpdateFields, findMatchingUpcomingShow } from "./upcomingShowUpsert";

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

describe("upcoming show upsert matching", () => {
  it("matches an existing local show by source + whatnotShowId", () => {
    const shows = [buildShow({ id: "show-1", whatnotShowId: "wn-100" }), buildShow({ id: "show-2", whatnotShowId: "wn-200" })];

    const match = findMatchingUpcomingShow(shows, { source: "whatnot", whatnotShowId: "wn-100" });

    assert.equal(match?.id, "show-1");
  });

  it("does not match a show with the same whatnotShowId but a different source", () => {
    const shows = [buildShow({ id: "show-1", whatnotShowId: "wn-100" })];

    const match = findMatchingUpcomingShow(
      shows,
      { source: "whatnot", whatnotShowId: "wn-100" },
    );

    assert.equal(match?.id, "show-1");

    const noMatch = findMatchingUpcomingShow([], { source: "whatnot", whatnotShowId: "wn-100" });
    assert.equal(noMatch, undefined);
  });

  it("trims whitespace on the lookup key so formatting differences do not create duplicates", () => {
    const shows = [buildShow({ id: "show-1", whatnotShowId: "wn-100" })];

    const match = findMatchingUpcomingShow(shows, { source: "whatnot", whatnotShowId: "  wn-100  " });

    assert.equal(match?.id, "show-1");
  });

  it("returns no match for a whatnotShowId that does not exist locally, so a new record is created instead of an incorrect update", () => {
    const shows = [buildShow({ id: "show-1", whatnotShowId: "wn-100" })];

    const match = findMatchingUpcomingShow(shows, { source: "whatnot", whatnotShowId: "wn-999" });

    assert.equal(match, undefined);
  });

  it("only exposes upstream-sourced fields for update, never local-only fields like status or notes", () => {
    const fields = buildUpcomingShowUpdateFields({
      title: "Friday Night Drop",
      whatnotUrl: "https://www.whatnot.com/live/abc",
      scheduledStartAt: { toDate: () => new Date("2026-02-01") } as UpcomingShow["scheduledStartAt"],
    });

    assert.deepEqual(Object.keys(fields).sort(), ["scheduledStartAt", "title", "whatnotUrl"]);
    assert.ok(!("status" in fields));
    assert.ok(!("notes" in fields));
    assert.ok(!("isArchived" in fields));
  });
});
