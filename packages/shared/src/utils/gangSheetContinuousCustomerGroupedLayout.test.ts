import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { planContinuousCustomerGroupedGangSheetLayout } from "./gangSheetContinuousCustomerGroupedLayout";
import { planSheetPerCustomerGangSheetLayout } from "./gangSheetGroupedLayout";
import { countSheetPerCustomerPhysicalSheets } from "./gangSheetProductionGroups";

const SPACING = { sideMarginPx: 75, topBottomMarginPx: 150, gutterPx: 150 };
const SHEET_WIDTH_PX = 6900;
const LABEL_FONT_SIZE_PX = 120;

function smallCustomerImage(input: {
  allocationId: string;
  printRequestId: string;
  requestName: string;
  customerId: string;
  quantity?: number;
}) {
  return {
    allocationId: input.allocationId,
    printRequestId: input.printRequestId,
    requestName: input.requestName,
    customerId: input.customerId,
    isInternal: false,
    quantity: input.quantity ?? 1,
    widthPx: 900,
    heightPx: 900,
  };
}

describe("continuous customer-grouped gang sheet layout", () => {
  it("places two small customers on one physical sheet", () => {
    const images = [
      smallCustomerImage({
        allocationId: "a1",
        printRequestId: "req-a",
        requestName: "alice-CR001",
        customerId: "cust-a",
      }),
      smallCustomerImage({
        allocationId: "b1",
        printRequestId: "req-b",
        requestName: "bob-CR002",
        customerId: "cust-b",
      }),
    ];

    const continuous = planContinuousCustomerGroupedGangSheetLayout({
      images,
      sheetWidthPx: SHEET_WIDTH_PX,
      spacingPx: SPACING,
      maxSheetHeightPx: 30000,
      sheetLabelFontSizePx: LABEL_FONT_SIZE_PX,
    });

    const sheetPerCustomer = planSheetPerCustomerGangSheetLayout({
      images,
      sheetWidthPx: SHEET_WIDTH_PX,
      spacingPx: SPACING,
      maxSheetHeightPx: 30000,
      sheetLabelFontSizePx: LABEL_FONT_SIZE_PX,
    });

    assert.equal(continuous.sheetCount, 1);
    assert.equal(continuous.physicalSheets[0]?.sections.length, 2);
    assert.equal(sheetPerCustomer.sheetCount, 2);
  });

  it("merges multiple CRs for one customer into one section block", () => {
    const images = [
      smallCustomerImage({
        allocationId: "a1",
        printRequestId: "req-a",
        requestName: "alice-CR001",
        customerId: "cust-a",
        quantity: 2,
      }),
      smallCustomerImage({
        allocationId: "a2",
        printRequestId: "req-a2",
        requestName: "alice-CR003",
        customerId: "cust-a",
        quantity: 1,
      }),
    ];

    const plan = planContinuousCustomerGroupedGangSheetLayout({
      images,
      sheetWidthPx: SHEET_WIDTH_PX,
      spacingPx: SPACING,
      maxSheetHeightPx: 30000,
      sheetLabelFontSizePx: LABEL_FONT_SIZE_PX,
    });

    assert.equal(plan.groupOrder.length, 1);
    assert.equal(plan.physicalSheets[0]?.sections.length, 1);
    assert.equal(plan.sectionHeadings[0], "alice-CR001, alice-CR003");
    assert.equal(
      plan.physicalSheets[0]?.sections[0]?.placementIds.length,
      3,
    );
  });

  it("uses Continued heading when a customer block spills across sheets", () => {
    const maxSheetHeightPx = 6000;
    const images = [
      {
        allocationId: "a1",
        printRequestId: "req-a",
        requestName: "alice-CR001",
        customerId: "cust-a",
        isInternal: false,
        quantity: 2,
        widthPx: 4000,
        heightPx: 4000,
      },
    ];

    const plan = planContinuousCustomerGroupedGangSheetLayout({
      images,
      sheetWidthPx: SHEET_WIDTH_PX,
      spacingPx: SPACING,
      maxSheetHeightPx,
      sheetLabelFontSizePx: LABEL_FONT_SIZE_PX,
    });

    assert.ok(plan.sheetCount >= 2);
    const continuedSection = plan.physicalSheets
      .flatMap((sheet) => sheet.sections)
      .find((section) => section.heading.endsWith("-Continued"));
    assert.ok(continuedSection);
    assert.equal(continuedSection?.heading, "alice-CR001-Continued");
  });

  it("matches sheet-per-customer compositor segment count for preview parity", () => {
    const images = [
      smallCustomerImage({
        allocationId: "a1",
        printRequestId: "req-a",
        requestName: "alice-CR001",
        customerId: "cust-a",
        quantity: 2,
      }),
      smallCustomerImage({
        allocationId: "b1",
        printRequestId: "req-b",
        requestName: "bob-CR002",
        customerId: "cust-b",
        quantity: 3,
      }),
    ];

    const plannerCount = planSheetPerCustomerGangSheetLayout({
      images,
      sheetWidthPx: SHEET_WIDTH_PX,
      spacingPx: SPACING,
      maxSheetHeightPx: 30000,
      sheetLabelFontSizePx: LABEL_FONT_SIZE_PX,
    }).sheetCount;

    const compositorEquivalent = countSheetPerCustomerPhysicalSheets({
      images,
      sheetWidthPx: SHEET_WIDTH_PX,
      spacingPx: SPACING,
      maxSheetHeightPx: 30000,
    });

    assert.equal(plannerCount, compositorEquivalent);
  });

  it("respects configured max sheet length when packing customers continuously", () => {
    const maxSheetHeightPx = 2500;
    const images = [
      smallCustomerImage({
        allocationId: "a1",
        printRequestId: "req-a",
        requestName: "alice-CR001",
        customerId: "cust-a",
      }),
      smallCustomerImage({
        allocationId: "b1",
        printRequestId: "req-b",
        requestName: "bob-CR002",
        customerId: "cust-b",
      }),
    ];

    const plan = planContinuousCustomerGroupedGangSheetLayout({
      images,
      sheetWidthPx: SHEET_WIDTH_PX,
      spacingPx: SPACING,
      maxSheetHeightPx,
      sheetLabelFontSizePx: LABEL_FONT_SIZE_PX,
    });

    assert.equal(plan.sheetCount, 2);
  });
});
