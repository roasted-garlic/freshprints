import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG } from "../constants/gangSheetSectionPricingSettings.constants";
import {
  calculatePrintRequestTotalPriceUsd,
  calculateShowAllocationTotalPriceUsd,
} from "./showAllocationDollarTotals";

describe("show allocation dollar totals", () => {
  it("prices every saved request item with quantity and length surcharge", () => {
    assert.equal(
      calculatePrintRequestTotalPriceUsd(
        [
          { id: "item-1", quantity: 2, printWidthInches: 3, printHeightInches: 3 },
          { id: "item-2", quantity: 1, printWidthInches: 11, printHeightInches: 18 },
        ],
        DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG,
      ),
      5,
    );
  });

  it("prefers immutable allocation snapshots and excludes canceled rows", () => {
    assert.equal(
      calculateShowAllocationTotalPriceUsd(
        [
          {
            status: "queued",
            allocatedQuantity: 2,
            printRequestItemId: "item-1",
            pricingSnapshot: { unitPriceUsd: 7 },
          },
          {
            status: "canceled",
            allocatedQuantity: 99,
            printRequestItemId: "item-1",
            pricingSnapshot: { unitPriceUsd: 99 },
          },
        ],
        new Map([["item-1", { id: "item-1", quantity: 2, printWidthInches: 3, printHeightInches: 3 }]]),
        DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG,
      ),
      14,
    );
  });

  it("uses a valid snapshot even when the legacy item linkage is absent", () => {
    assert.equal(
      calculateShowAllocationTotalPriceUsd(
        [{ status: "queued", allocatedQuantity: 3, printRequestItemId: "missing", pricingSnapshot: { unitPriceUsd: 4 } }],
        new Map(),
        DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG,
      ),
      12,
    );
  });

  it("uses saved item dimensions for legacy allocation fallback", () => {
    assert.equal(
      calculateShowAllocationTotalPriceUsd(
        [{ status: "queued", allocatedQuantity: 1, printRequestItemId: "item-1" }],
        new Map([["item-1", { id: "item-1", quantity: 1, printWidthInches: 11, printHeightInches: 18 }]]),
        DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG,
      ),
      3,
    );
  });

  it("returns null for missing or invalid pricing inputs instead of zero", () => {
    assert.equal(
      calculatePrintRequestTotalPriceUsd(
        [{ id: "item-1", quantity: 1, printWidthInches: undefined, printHeightInches: 3 }],
        DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG,
      ),
      null,
    );
    assert.equal(
      calculateShowAllocationTotalPriceUsd(
        [{ status: "queued", allocatedQuantity: 1, printRequestItemId: "missing" }],
        new Map(),
        DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG,
      ),
      null,
    );
  });
});
