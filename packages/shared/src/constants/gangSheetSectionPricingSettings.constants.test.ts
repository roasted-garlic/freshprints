import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG,
  resolveGangSheetSectionPricingFromShowQueueSettings,
} from "./gangSheetSectionPricingSettings.constants";

describe("resolveGangSheetSectionPricingFromShowQueueSettings", () => {
  it("returns owner-approved four-tier defaults when settings are missing", () => {
    const resolved = resolveGangSheetSectionPricingFromShowQueueSettings({});
    assert.deepEqual(resolved, DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG);
    assert.equal(resolved.sizeCutoffInches, 4);
    assert.equal(resolved.pocket.priceUsd, 1);
    assert.equal(resolved.standardFullSize.priceUsd, 2);
    assert.equal(resolved.standardOversized.priceUsd, 3);
    assert.equal(resolved.extraOversized.priceUsd, 4);
    assert.equal(resolved.pocket.weightOz, 0.4);
    assert.equal(resolved.extraOversized.weightOz, 0.75);
  });

  it("uses valid canonical overrides and ignores invalid values", () => {
    const resolved = resolveGangSheetSectionPricingFromShowQueueSettings({
      gangSheetPocketPriceUsd: 1.25,
      gangSheetPocketWeightOz: 0.45,
      gangSheetStandardFullSizePriceUsd: 2.5,
      gangSheetStandardFullSizeWeightOz: 0.8,
      gangSheetStandardOversizedPriceUsd: Number.NaN,
      gangSheetExtraOversizedWeightOz: -1,
      gangSheetSmallTierPriceUsd: 9,
      gangSheetLargeTierWeightOz: 1.2,
    });
    assert.equal(resolved.pocket.priceUsd, 1.25);
    assert.equal(resolved.pocket.weightOz, 0.45);
    assert.equal(resolved.standardFullSize.priceUsd, 2.5);
    assert.equal(resolved.standardFullSize.weightOz, 0.8);
    assert.equal(resolved.standardOversized.priceUsd, 3);
    assert.equal(resolved.extraOversized.weightOz, 1.2);
  });

  it("lets canonical values win over legacy values", () => {
    const resolved = resolveGangSheetSectionPricingFromShowQueueSettings({
      gangSheetPocketPriceUsd: 1.5,
      gangSheetSmallTierPriceUsd: 9,
      gangSheetStandardFullSizeWeightOz: 0.9,
      gangSheetLargeTierWeightOz: 1.9,
    });
    assert.equal(resolved.pocket.priceUsd, 1.5);
    assert.equal(resolved.standardFullSize.weightOz, 0.9);
  });
});
