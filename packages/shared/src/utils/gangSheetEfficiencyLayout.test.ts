import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { planEfficiencyGangSheetLayout } from "./gangSheetEfficiencyLayout";

const SPACING = { sideMarginPx: 75, topBottomMarginPx: 150, gutterPx: 150 };

describe("planEfficiencyGangSheetLayout regression contract", () => {
  it("preserves interleave order for duplicate allocation quantities", () => {
    const plan = planEfficiencyGangSheetLayout({
      images: [
        { allocationId: "a", quantity: 2, widthPx: 900, heightPx: 900 },
        { allocationId: "b", quantity: 2, widthPx: 900, heightPx: 900 },
      ],
      sheetWidthPx: 6900,
      spacingPx: SPACING,
      maxSheetHeightPx: 30000,
    });

    assert.deepEqual(plan.interleavedPlacementIds, ["1", "3", "2", "4"]);
    assert.equal(plan.sheetCount, 1);
  });

  it("reports multiple sheets when height cap is exceeded", () => {
    const plan = planEfficiencyGangSheetLayout({
      images: [{ allocationId: "tall", quantity: 15, widthPx: 900, heightPx: 4200 }],
      sheetWidthPx: 6900,
      spacingPx: SPACING,
      maxSheetHeightPx: 9000,
    });

    assert.ok(plan.sheetCount >= 2);
    assert.equal(
      plan.sheetPlacementIds.flat().length,
      plan.interleavedPlacementIds.length,
    );
  });
});
