import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { PortalPublicShowSummary } from "../types/portal/listPortalPublicShows.types";

import {
  findNextUpcomingShowWithDesigns,
  findShowsThisWeekWithDesigns,
  getLocalWeekRange,
} from "./portalShowDiscovery";

function show(
  partial: Partial<PortalPublicShowSummary> & Pick<PortalPublicShowSummary, "id">,
): PortalPublicShowSummary {
  return {
    scheduledStartAt: null,
    productionStatus: "open",
    uniquePublicCatalogDesignCount: 0,
    ...partial,
  };
}

describe("findNextUpcomingShowWithDesigns", () => {
  const now = new Date("2026-08-23T18:00:00.000Z");

  it("skips shows without designs and already-started shows", () => {
    const shows = [
      show({
        id: "empty",
        scheduledStartAt: "2026-08-24T01:00:00.000Z",
        uniquePublicCatalogDesignCount: 0,
      }),
      show({
        id: "past",
        scheduledStartAt: "2026-08-22T01:00:00.000Z",
        uniquePublicCatalogDesignCount: 5,
      }),
      show({
        id: "next",
        scheduledStartAt: "2026-08-25T01:00:00.000Z",
        uniquePublicCatalogDesignCount: 3,
      }),
      show({
        id: "later",
        scheduledStartAt: "2026-08-27T01:00:00.000Z",
        uniquePublicCatalogDesignCount: 2,
      }),
    ];

    assert.equal(findNextUpcomingShowWithDesigns(shows, now)?.id, "next");
  });
});

describe("findShowsThisWeekWithDesigns", () => {
  // Mid-week so "in-week + upcoming" fixtures stay inside Mon–Sun after `now`.
  const now = new Date("2026-08-19T18:00:00.000Z");

  it("returns only upcoming shows in the current local week that have designs", () => {
    const week = getLocalWeekRange(now);
    const inWeek = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    assert.ok(inWeek.getTime() > now.getTime());
    assert.ok(inWeek.getTime() <= week.end.getTime());

    const shows = [
      show({
        id: "in-week",
        scheduledStartAt: inWeek.toISOString(),
        uniquePublicCatalogDesignCount: 4,
      }),
      show({
        id: "next-week",
        scheduledStartAt: "2026-09-01T01:00:00.000Z",
        uniquePublicCatalogDesignCount: 4,
      }),
      show({
        id: "no-designs",
        scheduledStartAt: inWeek.toISOString(),
        uniquePublicCatalogDesignCount: 0,
      }),
      show({
        id: "earlier-this-week",
        scheduledStartAt: new Date(week.start.getTime() + 12 * 60 * 60 * 1000).toISOString(),
        uniquePublicCatalogDesignCount: 2,
      }),
    ];

    const result = findShowsThisWeekWithDesigns(shows, now);
    assert.deepEqual(
      result.map((entry) => entry.id),
      ["in-week"],
    );
  });
});
