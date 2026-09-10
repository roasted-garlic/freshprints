import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG } from "@fresh-prints/shared/constants/gangSheetSectionPricingSettings.constants";
import type { ShowAllocation } from "@fresh-prints/shared/types/showAllocation/showAllocation.types";

import { buildShowQueueGlanceStats, estimateGangSheetSheetCounts } from "./showQueueGlanceStats";

const layoutSettings = {
  sheetWidthInches: 22.5,
  sideMarginInches: 0.25,
  topBottomMarginInches: 0.25,
  gutterInches: 0.125,
  maxSheetLengthInches: 120,
  labelFontSizePx: 48,
};

function allocation(overrides: Partial<ShowAllocation> & Pick<ShowAllocation, "id" | "printRequestId">): ShowAllocation {
  return {
    upcomingShowId: "show-1",
    printRequestItemId: `${overrides.printRequestId}-item`,
    allocatedQuantity: 1,
    sourceItemQuantitySnapshot: 1,
    printWidthInches: 11,
    printHeightInches: 14,
    status: "queued",
    requestNameSnapshot: "CR-1",
    addedBy: "staff",
    updatedBy: "staff",
    createdAt: { toMillis: () => 1 } as ShowAllocation["createdAt"],
    updatedAt: { toMillis: () => 1 } as ShowAllocation["updatedAt"],
    ...overrides,
  };
}

describe("showQueueGlanceStats", () => {
  it("estimates sheet counts sync without network", () => {
    const counts = estimateGangSheetSheetCounts(
      [
        {
          allocationId: "a1",
          quantity: 2,
          widthPx: 3300,
          heightPx: 4200,
          grouping: {
            printRequestId: "pr-1",
            requestName: "CR-1",
            customerId: "c1",
            isInternal: false,
          },
        },
      ],
      layoutSettings,
    );

    assert.ok(counts.efficiencySheets >= 1);
    assert.ok(counts.groupedSheets >= 1);
    assert.ok(counts.continuousGroupedSheets >= 1);
  });

  it("builds glance totals from active allocations", () => {
    const stats = buildShowQueueGlanceStats({
      allocations: [
        allocation({ id: "a1", printRequestId: "pr-1", allocatedQuantity: 2, printWidthInches: 3 }),
        allocation({ id: "a2", printRequestId: "pr-2", allocatedQuantity: 1, printWidthInches: 11 }),
        allocation({
          id: "a3",
          printRequestId: "pr-3",
          allocatedQuantity: 9,
          printWidthInches: 11,
          status: "canceled",
        }),
      ],
      requestsById: new Map(),
      sectionPricing: DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG,
      layoutSettings,
      show: { scheduledStartAt: { toDate: () => new Date("2099-01-01T00:00:00.000Z") } },
    });

    assert.equal(stats.printRequestCount, 2);
    assert.equal(stats.printQuantity, 3);
    assert.equal(stats.designCount, 2);
    assert.equal(stats.totalPriceUsd, 2 * 1 + 2);
    assert.ok(stats.sheetCounts);
    assert.equal(stats.sizeClassCounts.pocketCount, 2);
    assert.equal(stats.sizeClassCounts.standardFullSizeCount, 1);
  });
});
