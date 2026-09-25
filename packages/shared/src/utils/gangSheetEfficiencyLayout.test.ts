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
    assert.ok(plan.totalSheetHeightPx > 0);
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
    assert.ok(plan.totalSheetHeightPx > 0);
  });

  it("sums nest sheet heights into totalSheetHeightPx", () => {
    const plan = planEfficiencyGangSheetLayout({
      images: [{ allocationId: "a", quantity: 1, widthPx: 900, heightPx: 900 }],
      sheetWidthPx: 6900,
      spacingPx: SPACING,
      maxSheetHeightPx: 30000,
    });

    assert.equal(plan.sheetCount, 1);
    // topBottom + height + topBottom = 150 + 900 + 150
    assert.equal(plan.totalSheetHeightPx, SPACING.topBottomMarginPx + 900 + SPACING.topBottomMarginPx);
  });

  it("packs the recorded landscape A/B fixture deterministically with exact quantities", () => {
    const input = {
      images: [
        { allocationId: "a", quantity: 10, widthPx: 3900, heightPx: 2805 },
        { allocationId: "b", quantity: 5, widthPx: 3600, heightPx: 2427 },
      ],
      sheetWidthPx: 6900,
      spacingPx: SPACING,
      maxSheetHeightPx: 90000,
    };

    const first = planEfficiencyGangSheetLayout(input);
    const second = planEfficiencyGangSheetLayout(input);

    assert.equal(first.totalSheetHeightPx, 30477);
    assert.equal(first.sheetCount, 1);
    assert.equal(first.sheetPlacementIds.flat().length, 15);
    assert.deepEqual(first, second);
    assert.deepEqual(first.skippedIds, []);
  });
});
