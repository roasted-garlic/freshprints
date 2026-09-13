import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG } from "@fresh-prints/shared/constants/gangSheetSectionPricingSettings.constants";
import type { ShowAllocation } from "@fresh-prints/shared/types/showAllocation/showAllocation.types";

import {
  buildShowQueueGlanceStats,
  estimateGangSheetSheetCounts,
  formatShowQueuePrintTimeEstimate,
  PRINT_SECONDS_PER_LINEAR_INCH,
} from "./showQueueGlanceStats";

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
    assert.ok(counts.efficiencyLinearInches > 0);
    assert.ok(counts.groupedSheets >= 1);
    assert.ok(counts.continuousGroupedSheets >= 1);
  });

  it("formats print time as duration · inches (ft) at 8 sec per inch, rounded up", () => {
    assert.equal(PRINT_SECONDS_PER_LINEAR_INCH, 8);
    assert.equal(formatShowQueuePrintTimeEstimate(94), "12m 32s · 94 in (7.83 ft)");
    assert.equal(formatShowQueuePrintTimeEstimate(0), "0s · 0 in (0 ft)");
    assert.equal(formatShowQueuePrintTimeEstimate(450.4), "1h 0m 8s · 451 in (37.58 ft)");
    // Bias over fractional inches so glance does not under-plan vs export.
    assert.equal(formatShowQueuePrintTimeEstimate(121.11), "16m 16s · 122 in (10.17 ft)");
  });

  it("includes per-sheet label band in efficiency linear inches", () => {
    const counts = estimateGangSheetSheetCounts(
      [
        {
          allocationId: "a1",
          quantity: 1,
          widthPx: 900,
          heightPx: 900,
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

    // Nest height alone is under export height; label band (60 + 48 + 330) / 300 = 1.46 in.
    const labelBandInches = (60 + layoutSettings.labelFontSizePx + 330) / 300;
    assert.equal(counts.efficiencySheets, 1);
    assert.ok(counts.efficiencyLinearInches > labelBandInches);
    assert.ok(
      counts.efficiencyLinearInches >= labelBandInches + 900 / 300,
      "linear inches should include nest artwork height plus label band",
    );
  });

  it("builds glance totals from active allocations including print time", () => {
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
    assert.ok(stats.sheetCounts!.efficiencyLinearInches > 0);
    assert.ok(stats.printTimeEstimateLabel);
    assert.match(
      stats.printTimeEstimateLabel!,
      /\d+m \d+s · \d+ in \(\d+(\.\d+)? ft\)|\d+s · \d+ in \(\d+(\.\d+)? ft\)|\d+h /,
    );
    assert.equal(stats.sizeClassCounts.pocketCount, 2);
    assert.equal(stats.sizeClassCounts.standardFullSizeCount, 1);
  });

  it("returns null print time when there are no exportable allocations", () => {
    const stats = buildShowQueueGlanceStats({
      allocations: [
        allocation({
          id: "a1",
          printRequestId: "pr-1",
          status: "canceled",
        }),
      ],
      requestsById: new Map(),
      sectionPricing: DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG,
      layoutSettings,
      show: { scheduledStartAt: { toDate: () => new Date("2099-01-01T00:00:00.000Z") } },
    });

    assert.equal(stats.printTimeEstimateLabel, null);
    assert.equal(stats.sheetCounts, null);
  });
});
