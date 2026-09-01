import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_GANG_SHEET_LARGE_TIER_PRICE_USD,
  DEFAULT_GANG_SHEET_LARGE_TIER_WEIGHT_OZ,
  DEFAULT_GANG_SHEET_SECTION_PRICE_CUTOFF_INCHES,
  DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG,
  DEFAULT_GANG_SHEET_SMALL_TIER_PRICE_USD,
  DEFAULT_GANG_SHEET_SMALL_TIER_WEIGHT_OZ,
  resolveGangSheetSectionPricingFromShowQueueSettings,
} from "./gangSheetSectionPricingSettings.constants";

describe("resolveGangSheetSectionPricingFromShowQueueSettings", () => {
  it("returns documented defaults when settings are missing", () => {
    assert.deepEqual(resolveGangSheetSectionPricingFromShowQueueSettings({}), DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG);
    assert.equal(DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG.sizeCutoffInches, 5);
    assert.equal(DEFAULT_GANG_SHEET_SMALL_TIER_PRICE_USD, 1);
    assert.equal(DEFAULT_GANG_SHEET_SMALL_TIER_WEIGHT_OZ, 0.4);
    assert.equal(DEFAULT_GANG_SHEET_LARGE_TIER_PRICE_USD, 2);
    assert.equal(DEFAULT_GANG_SHEET_LARGE_TIER_WEIGHT_OZ, 0.75);
  });

  it("ignores invalid persisted values and falls back per field", () => {
    const resolved = resolveGangSheetSectionPricingFromShowQueueSettings({
      gangSheetSectionPriceCutoffInches: Number.NaN,
      gangSheetSmallTierPriceUsd: -1,
      gangSheetSmallTierWeightOz: 0,
      gangSheetLargeTierPriceUsd: Number.POSITIVE_INFINITY,
      gangSheetLargeTierWeightOz: -5,
    });

    assert.deepEqual(resolved, DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG);
  });

  it("uses valid persisted overrides", () => {
    const resolved = resolveGangSheetSectionPricingFromShowQueueSettings({
      gangSheetSectionPriceCutoffInches: 6,
      gangSheetSmallTierPriceUsd: 1.5,
      gangSheetSmallTierWeightOz: 0.45,
      gangSheetLargeTierPriceUsd: 3,
      gangSheetLargeTierWeightOz: 0.9,
    });

    assert.equal(resolved.sizeCutoffInches, 6);
    assert.equal(resolved.smallTierPriceUsd, 1.5);
    assert.equal(resolved.smallTierWeightOz, 0.45);
    assert.equal(resolved.largeTierPriceUsd, 3);
    assert.equal(resolved.largeTierWeightOz, 0.9);
  });
});
