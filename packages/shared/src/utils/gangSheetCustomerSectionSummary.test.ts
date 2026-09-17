import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG } from "../constants/gangSheetSectionPricingSettings.constants";
import {
  buildGangSheetLengthLine,
  buildGangSheetPriceLine,
  buildGangSheetWeightLine,
  calculateGangSheetCustomerSectionSummary,
  resolveGangSheetPriceTierForInches,
} from "./gangSheetCustomerSectionSummary";

const defaultPricing = DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG;

describe("gangSheetCustomerSectionSummary classification", () => {
  it("uses continuous saved-width boundaries", () => {
    assert.equal(resolveGangSheetPriceTierForInches(4), "pocket");
    assert.equal(resolveGangSheetPriceTierForInches(4.5), "standard_full_size");
    assert.equal(resolveGangSheetPriceTierForInches(10.5), "standard_full_size");
    assert.equal(resolveGangSheetPriceTierForInches(11), "standard_full_size");
    assert.equal(resolveGangSheetPriceTierForInches(11.5), "standard_oversized");
    assert.equal(resolveGangSheetPriceTierForInches(12), "standard_oversized");
    assert.equal(resolveGangSheetPriceTierForInches(14), "standard_oversized");
    assert.equal(resolveGangSheetPriceTierForInches(14.5), "extra_oversized");
    assert.equal(resolveGangSheetPriceTierForInches(15), "extra_oversized");
  });

  it("rejects invalid widths", () => {
    for (const width of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      assert.throws(() => resolveGangSheetPriceTierForInches(width), RangeError);
    }
  });
});

describe("gangSheetCustomerSectionSummary calculations", () => {
  it("calculates default four-tier totals and exact quantity", () => {
    const summary = calculateGangSheetCustomerSectionSummary(
      [
        { printWidthInches: 4, printHeightInches: 8, quantity: 1 },
        { printWidthInches: 10.5, printHeightInches: 2, quantity: 2 },
        { printWidthInches: 12, printHeightInches: 2, quantity: 3 },
        { printWidthInches: 15, printHeightInches: 2, quantity: 4 },
      ],
      defaultPricing,
    );
    assert.deepEqual(summary.tierQuantities, {
      pocket: 0,
      standard_full_size: 3,
      standard_oversized: 3,
      extra_oversized: 4,
    });
    assert.equal(summary.totalQuantity, 10);
    assert.equal(summary.totalPriceUsd, 31);
    assert.equal(summary.totalWeightOz, 7.5);
    assert.equal(summary.priceLine, "Price: $2 x 3 + $3 x 3 + $4 x 4 = $31");
    assert.equal(summary.lengthLine, null);
    assert.equal(summary.weightLine, "Weight: 0.75oz x 3 + 0.75oz x 3 + 0.75oz x 4 = 7.5 oz");
  });

  it("uses height to disqualify Pocket and applies the shared length surcharge", () => {
    const summary = calculateGangSheetCustomerSectionSummary(
      [{ printWidthInches: 4, printHeightInches: 20 }],
      {
        ...defaultPricing,
        lengthSurcharges: { standardLengthUsd: 0, longUsd: 1, extraLongUsd: 2, extendedUsd: 3 },
      },
    );
    assert.equal(summary.tierQuantities.standard_full_size, 1);
    assert.equal(summary.lengthTierQuantities.extra_long, 1);
    assert.equal(summary.totalPriceUsd, 4);
    assert.equal(summary.priceBreakdowns[0]?.unitPriceUsd, 4);
    assert.equal(summary.priceLine, "Price: $2 x 1 = $2");
    assert.equal(summary.lengthLine, "Length: $2 x 1 = $2");
  });

  it("omits length line when surcharges are zero", () => {
    const pricing = {
      ...defaultPricing,
      lengthSurcharges: { standardLengthUsd: 0, longUsd: 0, extraLongUsd: 0, extendedUsd: 0 },
    };
    const summary = calculateGangSheetCustomerSectionSummary(
      [{ printWidthInches: 10, printHeightInches: 20, quantity: 2 }],
      pricing,
    );
    assert.equal(summary.lengthLine, null);
    assert.equal(buildGangSheetLengthLine(summary.lengthTierQuantities, pricing), null);
  });

  it("calculates custom tier prices and weights", () => {
    const customPricing = {
      ...defaultPricing,
      pocket: { priceUsd: 1.25, weightOz: 0.3 },
      standardFullSize: { priceUsd: 2.5, weightOz: 0.8 },
      standardOversized: { priceUsd: 3.5, weightOz: 0.9 },
      extraOversized: { priceUsd: 4.5, weightOz: 1.1 },
    };
    const summary = calculateGangSheetCustomerSectionSummary(
      [
        { printWidthInches: 7, printHeightInches: 7, quantity: 4 },
        { printWidthInches: 4, printHeightInches: 4, quantity: 2 },
      ],
      customPricing,
    );
    assert.equal(summary.totalPriceUsd, 12.5);
    assert.equal(summary.totalWeightOz, 3.8);
  });

  it("orders visible breakdown terms by configured price", () => {
    const customPricing = {
      ...defaultPricing,
      pocket: { priceUsd: 4, weightOz: 0.4 },
      standardFullSize: { priceUsd: 1, weightOz: 0.75 },
    };
    const summary = calculateGangSheetCustomerSectionSummary(
      [
        { printWidthInches: 4, printHeightInches: 4, quantity: 1 },
        { printWidthInches: 8, printHeightInches: 8, quantity: 2 },
      ],
      customPricing,
    );
    assert.equal(summary.priceLine, "Price: $1 x 2 + $4 x 1 = $6");
  });

  it("formats zero-count terms out of price and weight lines", () => {
    const quantities = { pocket: 0, standard_full_size: 0, standard_oversized: 0, extra_oversized: 5 } as const;
    assert.equal(buildGangSheetPriceLine(quantities, defaultPricing), "Price: $4 x 5 = $20");
    assert.equal(buildGangSheetWeightLine(quantities, defaultPricing), "Weight: 0.75oz x 5 = 3.75 oz");
  });
});
