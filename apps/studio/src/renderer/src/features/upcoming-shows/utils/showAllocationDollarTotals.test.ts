import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG } from "@fresh-prints/shared/constants/gangSheetSectionPricingSettings.constants";
import { buildProductionShapedShowAllocations } from "@fresh-prints/shared/utils/printRequestCountParity.fixture";

import {
  calculateShowAllocationGroupPriceUsd,
  formatShowAllocationPriceUsd,
  sumShowAllocationGroupPricesUsd,
} from "./showAllocationDollarTotals";

describe("showAllocationDollarTotals", () => {
  it("prices active allocations with shared gang-sheet tiers", () => {
    const total = calculateShowAllocationGroupPriceUsd(
      [
        {
          printWidthInches: 3,
          printHeightInches: 3,
          allocatedQuantity: 2,
          status: "queued",
        },
        {
          printWidthInches: 11,
          printHeightInches: 14,
          allocatedQuantity: 1,
          status: "queued",
        },
      ],
      DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG,
    );

    // 2 × pocket ($1) + 1 × standard full ($2) under default pricing
    assert.equal(total, 2 * 1 + 2);
  });

  it("ignores canceled allocations", () => {
    const total = calculateShowAllocationGroupPriceUsd(
      [
        {
          printWidthInches: 11,
          printHeightInches: 14,
          allocatedQuantity: 3,
          status: "canceled",
        },
        {
          printWidthInches: 11,
          printHeightInches: 14,
          allocatedQuantity: 1,
          status: "queued",
        },
      ],
      DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG,
    );

    assert.equal(total, 2);
  });

  it("prefers an immutable allocation pricing snapshot over current settings", () => {
    const total = calculateShowAllocationGroupPriceUsd(
      [
        {
          printWidthInches: 5,
          printHeightInches: 21,
          allocatedQuantity: 3,
          status: "queued",
          pricingSnapshot: {
            policyVersion: "width-four-tier-length-surcharge-v1",
            widthTier: "standard_full_size",
            basePriceUsd: 2,
            lengthTier: "extra_long",
            lengthSurchargeUsd: 2,
            unitPriceUsd: 4,
          },
        },
      ],
      {
        ...DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG,
        standardFullSize: { priceUsd: 99, weightOz: 0.75 },
      },
    );

    assert.equal(total, 12);
  });

  it("prices a valid snapshot when legacy dimensions are absent", () => {
    const total = calculateShowAllocationGroupPriceUsd(
      [
        {
          allocatedQuantity: 3,
          status: "queued",
          pricingSnapshot: {
            policyVersion: "width-four-tier-length-surcharge-v1",
            widthTier: "standard_full_size",
            basePriceUsd: 2,
            lengthTier: "extra_long",
            lengthSurchargeUsd: 2,
            unitPriceUsd: 4,
          },
        },
      ],
      {
        ...DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG,
        standardFullSize: { priceUsd: 99, weightOz: 0.75 },
      },
    );

    assert.equal(total, 12);
  });

  it("returns null when only canceled allocations exist", () => {
    assert.equal(
      calculateShowAllocationGroupPriceUsd(
        [
          {
            printWidthInches: 11,
            printHeightInches: 14,
            allocatedQuantity: 2,
            status: "canceled",
          },
        ],
        DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG,
      ),
      null,
    );
  });

  it("returns null when print width is missing", () => {
    assert.equal(
      calculateShowAllocationGroupPriceUsd(
        [
          {
            allocatedQuantity: 1,
            status: "queued",
          },
        ],
        DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG,
      ),
      null,
    );
  });

  it("sums priced groups and skips nulls", () => {
    assert.equal(sumShowAllocationGroupPricesUsd([24, null, 6, 0]), 30);
  });

  it("formats whole-dollar amounts without decimals", () => {
    assert.equal(formatShowAllocationPriceUsd(24), "$24");
    assert.equal(formatShowAllocationPriceUsd(24.5), "$24.50");
  });

  it("keeps the production-shaped active price at $56 despite canceled history", () => {
    const total = calculateShowAllocationGroupPriceUsd(
      buildProductionShapedShowAllocations(),
      DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG,
    );

    assert.equal(total, 56);
  });
});
