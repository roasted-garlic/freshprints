import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG } from "../constants/gangSheetSectionPricingSettings.constants";
import {
  buildGangSheetPriceLine,
  buildGangSheetWeightLine,
  calculateGangSheetCustomerSectionSummary,
  resolveGangSheetPriceTierForInches,
} from "./gangSheetCustomerSectionSummary";

const defaultPricing = DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG;

describe("gangSheetCustomerSectionSummary classification", () => {
  it("uses small tier when both dimensions are exactly the cutoff", () => {
    assert.equal(resolveGangSheetPriceTierForInches(5, 5), "small");
    assert.equal(resolveGangSheetPriceTierForInches(5, 4), "small");
    assert.equal(resolveGangSheetPriceTierForInches(4, 5), "small");
    assert.equal(resolveGangSheetPriceTierForInches(5, 5.0), "small");
  });

  it("uses large tier when either dimension exceeds the cutoff", () => {
    assert.equal(resolveGangSheetPriceTierForInches(5.01, 5), "large");
    assert.equal(resolveGangSheetPriceTierForInches(5, 5.01), "large");
    assert.equal(resolveGangSheetPriceTierForInches(6, 3), "large");
  });

  it("respects a custom cutoff", () => {
    assert.equal(resolveGangSheetPriceTierForInches(6, 6, 6), "small");
    assert.equal(resolveGangSheetPriceTierForInches(6.01, 4, 6), "large");
  });
});

describe("gangSheetCustomerSectionSummary calculations", () => {
  it("calculates all-large defaults", () => {
    const summary = calculateGangSheetCustomerSectionSummary(
      Array.from({ length: 20 }, () => ({ printWidthInches: 8, printHeightInches: 8 })),
      defaultPricing,
    );
    assert.equal(summary.largeTierQuantity, 20);
    assert.equal(summary.smallTierQuantity, 0);
    assert.equal(summary.totalPriceUsd, 40);
    assert.equal(summary.priceLine, "$2 x 20 = $40");
    assert.equal(summary.weightLine, "Weight: 0.75oz x 20 = 15 oz");
  });

  it("calculates all-small defaults", () => {
    const summary = calculateGangSheetCustomerSectionSummary(
      Array.from({ length: 20 }, () => ({ printWidthInches: 5, printHeightInches: 5 })),
      defaultPricing,
    );
    assert.equal(summary.largeTierQuantity, 0);
    assert.equal(summary.smallTierQuantity, 20);
    assert.equal(summary.totalPriceUsd, 20);
    assert.equal(summary.priceLine, "$1 x 20 = $20");
    assert.equal(summary.weightLine, "Weight: 0.40oz x 20 = 8 oz");
  });

  it("calculates mixed-tier defaults", () => {
    const summary = calculateGangSheetCustomerSectionSummary(
      [
        ...Array.from({ length: 10 }, () => ({ printWidthInches: 8, printHeightInches: 8 })),
        ...Array.from({ length: 10 }, () => ({ printWidthInches: 5, printHeightInches: 5 })),
      ],
      defaultPricing,
    );
    assert.equal(summary.totalPriceUsd, 30);
    assert.equal(summary.priceLine, "$2 x 10 + $1 x 10 = $30");
    assert.equal(summary.weightLine, "Weight: 0.75oz x 10 + 0.40oz x 10 = 11.5 oz");
    assert.equal(summary.totalWeightOz, 11.5);
  });

  it("calculates custom tier prices and weights", () => {
    const customPricing = {
      sizeCutoffInches: 5,
      smallTierPriceUsd: 1.25,
      smallTierWeightOz: 0.3,
      largeTierPriceUsd: 2.5,
      largeTierWeightOz: 0.8,
    };
    const summary = calculateGangSheetCustomerSectionSummary(
      [
        ...Array.from({ length: 4 }, () => ({ printWidthInches: 7, printHeightInches: 7 })),
        ...Array.from({ length: 2 }, () => ({ printWidthInches: 4, printHeightInches: 4 })),
      ],
      customPricing,
    );
    assert.equal(summary.totalPriceUsd, 12.5);
    assert.equal(summary.priceLine, "$2.5 x 4 + $1.25 x 2 = $12.50");
    assert.equal(summary.weightLine, "Weight: 0.80oz x 4 + 0.30oz x 2 = 3.8 oz");
  });

  it("omits zero-count terms in price and weight helpers", () => {
    assert.equal(buildGangSheetPriceLine(0, 5, defaultPricing), "$2 x 5 = $10");
    assert.equal(buildGangSheetPriceLine(3, 0, defaultPricing), "$1 x 3 = $3");
    assert.equal(
      buildGangSheetWeightLine(10, 10, defaultPricing),
      "Weight: 0.75oz x 10 + 0.40oz x 10 = 11.5 oz",
    );
  });
});
