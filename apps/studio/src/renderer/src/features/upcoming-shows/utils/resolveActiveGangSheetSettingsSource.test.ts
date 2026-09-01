import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { UpcomingShow } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.types";

import { resolveActiveGangSheetSettingsSource } from "./resolveActiveGangSheetSettingsSource";

describe("resolveActiveGangSheetSettingsSource", () => {
  const showQueueSettings = {
    gangSheetSmallTierPriceUsd: 1,
    gangSheetLargeTierPriceUsd: 2,
  };

  const internalGangSheetSettings = {
    gangSheetSmallTierPriceUsd: 3,
    gangSheetLargeTierPriceUsd: 4,
  };

  it("uses internal settings for staff gang sheet shows", () => {
    const show = { source: "staff_gang_sheet" } as UpcomingShow;
    assert.deepEqual(
      resolveActiveGangSheetSettingsSource(show, showQueueSettings, internalGangSheetSettings),
      internalGangSheetSettings,
    );
  });

  it("uses show queue settings for Whatnot shows", () => {
    const show = { source: "whatnot" } as UpcomingShow;
    assert.deepEqual(
      resolveActiveGangSheetSettingsSource(show, showQueueSettings, internalGangSheetSettings),
      showQueueSettings,
    );
  });

  it("defaults to show queue settings when no show is selected", () => {
    assert.deepEqual(
      resolveActiveGangSheetSettingsSource(null, showQueueSettings, internalGangSheetSettings),
      showQueueSettings,
    );
  });
});
