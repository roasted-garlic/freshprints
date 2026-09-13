import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { UpcomingShow } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.types";

import {
  formatUpcomingShowTitle,
  formatUpcomingShowWhatnotIdentityLabel,
} from "./upcomingShowDisplay";

describe("upcomingShowDisplay — DEV fixture identity", () => {
  it("shows DEV OVERRIDE for dev_fixture source", () => {
    const show = {
      id: "dev-1",
      source: "dev_fixture",
      devFixtureSentinel: "DEV-OVERRIDE",
      status: "scheduled",
      syncStatus: "idle",
      isArchived: false,
      productionStatus: "open",
      maxQuantityOverridden: false,
      allocatedQuantity: 0,
    } as UpcomingShow;

    assert.equal(formatUpcomingShowWhatnotIdentityLabel(show), "DEV OVERRIDE");
    assert.equal(formatUpcomingShowTitle(show), "DEV fixture show");
  });

  it("keeps Whatnot show ID label for whatnot source", () => {
    const show = {
      id: "wn-1",
      source: "whatnot",
      whatnotShowId: "abc-123",
      status: "scheduled",
      syncStatus: "idle",
      isArchived: false,
      productionStatus: "open",
      maxQuantityOverridden: false,
      allocatedQuantity: 0,
    } as UpcomingShow;

    assert.equal(formatUpcomingShowWhatnotIdentityLabel(show), "abc-123");
  });
});
