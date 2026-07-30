import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { shouldIncludePortalCalendarShow } from "./portalCalendarShowVisibility";

const now = new Date("2026-07-28T12:00:00.000Z");
const windowStart = new Date("2026-05-01T00:00:00.000Z");
const at = (iso: string) => ({ toDate: () => new Date(iso) });

describe("bounded Portal calendar show visibility", () => {
  it("keeps a just-finished future show as display-only calendar data", () => {
    assert.equal(shouldIncludePortalCalendarShow({
      show: { id: "finished", scheduledStartAt: at("2026-07-29T12:00:00.000Z"), productionStatus: "completed" },
      allocatableIds: new Set(),
      pastCutoffUpcomingIds: new Set(),
      now,
      pastWindowStart: windowStart,
    }), true);
  });

  it("keeps bounded past shows and rejects out-of-window or unscheduled nonterminal shows", () => {
    const base = { allocatableIds: new Set<string>(), pastCutoffUpcomingIds: new Set<string>(), now, pastWindowStart: windowStart };
    assert.equal(shouldIncludePortalCalendarShow({
      ...base, show: { id: "past", scheduledStartAt: at("2026-06-01T12:00:00.000Z"), productionStatus: "open" },
    }), true);
    assert.equal(shouldIncludePortalCalendarShow({
      ...base, show: { id: "old", scheduledStartAt: at("2026-04-30T12:00:00.000Z"), productionStatus: "open" },
    }), false);
    assert.equal(shouldIncludePortalCalendarShow({
      ...base, show: { id: "none", scheduledStartAt: undefined, productionStatus: "open" },
    }), false);
  });
});
