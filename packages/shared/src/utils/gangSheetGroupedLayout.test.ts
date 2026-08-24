import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildGroupedGangSheetSectionHeading, buildGroupedGangSheetSectionContinuedHeading, resolveGangSheetProductionGroupKey } from "./groupPrintRequestsByShow";
import { planGroupedGangSheetLayout } from "./gangSheetGroupedLayout";

const SPACING = { sideMarginPx: 75, topBottomMarginPx: 150, gutterPx: 150 };

describe("grouped gang sheet layout", () => {
  it("joins unique request names for the same customer group", () => {
    assert.equal(
      buildGroupedGangSheetSectionHeading(["roasted_garlic-IR002", "roasted_garlic-IR001"]),
      "roasted_garlic-IR001, roasted_garlic-IR002",
    );
  });

  it("appends -Continued for spillover section headings", () => {
    assert.equal(
      buildGroupedGangSheetSectionContinuedHeading("roasted_garlic-CR001, roasted_garlic-CR002"),
      "roasted_garlic-CR001, roasted_garlic-CR002-Continued",
    );
  });

  it("groups internal requests by internalBaseName", () => {
    const left = resolveGangSheetProductionGroupKey({
      printRequestId: "req-a",
      isInternal: true,
      internalBaseName: "roasted_garlic",
    });
    const right = resolveGangSheetProductionGroupKey({
      printRequestId: "req-b",
      isInternal: true,
      internalBaseName: "roasted_garlic",
    });
    assert.equal(left, right);
  });

  it("plans multi-user output with exact quantities preserved", () => {
    const plan = planGroupedGangSheetLayout({
      images: [
        {
          allocationId: "a1",
          printRequestId: "req-a",
          requestName: "alice-CR001",
          customerId: "cust-a",
          isInternal: false,
          quantity: 2,
          widthPx: 900,
          heightPx: 900,
        },
        {
          allocationId: "b1",
          printRequestId: "req-b",
          requestName: "bob-CR002",
          customerId: "cust-b",
          isInternal: false,
          quantity: 3,
          widthPx: 900,
          heightPx: 900,
        },
        {
          allocationId: "a2",
          printRequestId: "req-a2",
          requestName: "alice-CR003",
          customerId: "cust-a",
          isInternal: false,
          quantity: 1,
          widthPx: 900,
          heightPx: 900,
        },
      ],
      sheetWidthPx: 6900,
      spacingPx: SPACING,
      maxSheetHeightPx: 30000,
      sheetLabelFontSizePx: 120,
    });

    assert.equal(plan.groupOrder.length, 2);
    assert.equal(plan.sectionHeadings.length, 2);
    assert.equal(plan.sheetPlacementIds.flat().length, 6);
    assert.ok(plan.sheetCount >= 1);
  });
});
