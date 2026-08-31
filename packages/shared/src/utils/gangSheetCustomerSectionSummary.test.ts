import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildGangSheetPriceLine,
  buildGangSheetWeightLine,
  calculateGangSheetCustomerSectionSummary,
  resolveGangSheetPriceTierForInches,
} from "./gangSheetCustomerSectionSummary";

describe("gangSheetCustomerSectionSummary", () => {
  it("prices exactly 6 inches at $2", () => {
    assert.equal(resolveGangSheetPriceTierForInches(6, 4), 2);
  });

  it("prices both dimensions below 6 inches at $1", () => {
    assert.equal(resolveGangSheetPriceTierForInches(5.99, 5.99), 1);
  });

  it("calculates single-tier $2 totals", () => {
    const summary = calculateGangSheetCustomerSectionSummary(
      Array.from({ length: 20 }, () => ({ printWidthInches: 8, printHeightInches: 8 })),
    );
    assert.equal(summary.twoDollarQuantity, 20);
    assert.equal(summary.oneDollarQuantity, 0);
    assert.equal(summary.totalPriceUsd, 40);
    assert.equal(summary.priceLine, "$2 x 20 = $40");
    assert.equal(summary.weightLine, "Weight: 0.75oz x 20 = 15 oz");
  });

  it("calculates mixed-tier totals", () => {
    const summary = calculateGangSheetCustomerSectionSummary([
      ...Array.from({ length: 10 }, () => ({ printWidthInches: 8, printHeightInches: 8 })),
      ...Array.from({ length: 10 }, () => ({ printWidthInches: 4, printHeightInches: 5 })),
    ]);
    assert.equal(summary.totalPriceUsd, 30);
    assert.equal(summary.priceLine, "$2 x 10 + $1 x 10 = $30");
    assert.equal(summary.totalWeightOz, 15);
  });

  it("preserves fractional ounce totals", () => {
    assert.equal(buildGangSheetWeightLine(21), "Weight: 0.75oz x 21 = 15.75 oz");
  });

  it("omits zero-count terms in price line helper", () => {
    assert.equal(buildGangSheetPriceLine(0, 5), "$2 x 5 = $10");
    assert.equal(buildGangSheetPriceLine(3, 0), "$1 x 3 = $3");
    assert.equal(buildGangSheetPriceLine(10, 10), "$2 x 10 + $1 x 10 = $30");
  });
});
