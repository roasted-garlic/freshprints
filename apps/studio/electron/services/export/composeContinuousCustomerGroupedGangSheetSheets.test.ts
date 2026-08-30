import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { composeContinuousCustomerGroupedGangSheetSheets } from "./composeContinuousCustomerGroupedGangSheetSheets";
import { composeGroupedGangSheetSheets } from "./composeGroupedGangSheetSheets";
import { loadSharpModule } from "../import/loadSharpModule";
import type { GenerateGangSheetPngRequest } from "@fresh-prints/shared/types/export/gangSheetExportIpc.types";
import { planContinuousCustomerGroupedGangSheetLayout } from "@fresh-prints/shared/utils/gangSheetContinuousCustomerGroupedLayout";
import { countSheetPerCustomerPhysicalSheets } from "@fresh-prints/shared/utils/gangSheetProductionGroups";

const EXPORT_DPI = 300;
const SPACING = { sideMarginPx: 75, topBottomMarginPx: 150, gutterPx: 150 };
const SHEET_WIDTH_PX = 6900;
const MAX_SHEET_HEIGHT_PX = 30000;
const LABEL_FONT_SIZE_PX = 120;

async function createTransparentPng(widthPx: number, heightPx: number): Promise<Buffer> {
  const sharp = await loadSharpModule();
  return sharp({
    create: {
      width: widthPx,
      height: heightPx,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
    limitInputPixels: false,
  })
    .png()
    .toBuffer();
}

function buildGroupedRequest(layoutMode: GenerateGangSheetPngRequest["layoutMode"]): GenerateGangSheetPngRequest {
  return {
    showId: "show-test",
    baseFileName: "whatnot_07-06-2026_grouped-continuous-gang-sheet",
    sheetWidthInches: SHEET_WIDTH_PX / EXPORT_DPI,
    sideMarginInches: SPACING.sideMarginPx / EXPORT_DPI,
    topBottomMarginInches: SPACING.topBottomMarginPx / EXPORT_DPI,
    gutterInches: SPACING.gutterPx / EXPORT_DPI,
    maxSheetLengthInches: MAX_SHEET_HEIGHT_PX / EXPORT_DPI,
    labelFontSizePx: LABEL_FONT_SIZE_PX,
    layoutMode,
    images: [
      {
        allocationId: "alloc-a",
        downloadUrl: "https://firebasestorage.googleapis.com/v0/b/x/o/a",
        targetWidthPx: 900,
        targetHeightPx: 900,
        fileName: "alice.png",
        quantity: 1,
        grouping: {
          printRequestId: "req-a",
          requestName: "alice-CR001",
          customerId: "cust-a",
          isInternal: false,
        },
      },
      {
        allocationId: "alloc-b",
        downloadUrl: "https://firebasestorage.googleapis.com/v0/b/x/o/b",
        targetWidthPx: 900,
        targetHeightPx: 900,
        fileName: "bob.png",
        quantity: 1,
        grouping: {
          printRequestId: "req-b",
          requestName: "bob-CR002",
          customerId: "cust-b",
          isInternal: false,
        },
      },
    ],
  };
}

async function buildResizedMap(): Promise<Map<string, Array<{
  id: string;
  allocationId: string;
  fileName: string;
  pngBytes: Buffer;
  widthPx: number;
  heightPx: number;
}>>> {
  const pngBytes = await createTransparentPng(900, 900);
  const map = new Map<string, Array<{
    id: string;
    allocationId: string;
    fileName: string;
    pngBytes: Buffer;
    widthPx: number;
    heightPx: number;
  }>>();

  map.set("alloc-a", [
    {
      id: "1",
      allocationId: "alloc-a",
      fileName: "alice.png",
      pngBytes,
      widthPx: 900,
      heightPx: 900,
    },
  ]);
  map.set("alloc-b", [
    {
      id: "2",
      allocationId: "alloc-b",
      fileName: "bob.png",
      pngBytes,
      widthPx: 900,
      heightPx: 900,
    },
  ]);

  return map;
}

describe("composeContinuousCustomerGroupedGangSheetSheets", () => {
  it("composites two customer section bands onto one physical PNG", async () => {
    const request = buildGroupedRequest("customer_grouped_continuous");
    const resizedByAllocationId = await buildResizedMap();

    const composed = await composeContinuousCustomerGroupedGangSheetSheets({
      request,
      resizedByAllocationId,
      sheetWidthPx: SHEET_WIDTH_PX,
      spacingPx: SPACING,
      maxSheetHeightPx: MAX_SHEET_HEIGHT_PX,
      warnings: [],
    });

    assert.equal(composed.length, 1);

    const oneCustomerRequest = {
      ...request,
      images: [request.images[0]!],
    };
    const oneCustomerResized = new Map([["alloc-a", resizedByAllocationId.get("alloc-a")!]]);
    const oneCustomerComposed = await composeContinuousCustomerGroupedGangSheetSheets({
      request: oneCustomerRequest,
      resizedByAllocationId: oneCustomerResized,
      sheetWidthPx: SHEET_WIDTH_PX,
      spacingPx: SPACING,
      maxSheetHeightPx: MAX_SHEET_HEIGHT_PX,
      warnings: [],
    });

    assert.ok(composed[0]!.heightPx > oneCustomerComposed[0]!.heightPx);
  });

  it("matches continuous planner sheet count for the same allocation set", async () => {
    const request = buildGroupedRequest("customer_grouped_continuous");
    const resizedByAllocationId = await buildResizedMap();

    const plannerCount = planContinuousCustomerGroupedGangSheetLayout({
      images: request.images.map((image) => ({
        allocationId: image.allocationId,
        printRequestId: image.grouping!.printRequestId,
        requestName: image.grouping!.requestName,
        customerId: image.grouping!.customerId,
        isInternal: image.grouping!.isInternal,
        quantity: image.quantity,
        widthPx: image.targetWidthPx,
        heightPx: image.targetHeightPx,
      })),
      sheetWidthPx: SHEET_WIDTH_PX,
      spacingPx: SPACING,
      maxSheetHeightPx: MAX_SHEET_HEIGHT_PX,
      sheetLabelFontSizePx: LABEL_FONT_SIZE_PX,
    }).sheetCount;

    const composed = await composeContinuousCustomerGroupedGangSheetSheets({
      request,
      resizedByAllocationId,
      sheetWidthPx: SHEET_WIDTH_PX,
      spacingPx: SPACING,
      maxSheetHeightPx: MAX_SHEET_HEIGHT_PX,
      warnings: [],
    });

    assert.equal(composed.length, plannerCount);
  });

  it("creates separate physical sheets for sheet-per-customer mode", async () => {
    const request = buildGroupedRequest("grouped_by_customer");
    request.baseFileName = "whatnot_07-06-2026_grouped-gang-sheet";
    const resizedByAllocationId = await buildResizedMap();

    const compositorCount = countSheetPerCustomerPhysicalSheets({
      images: request.images.map((image) => ({
        allocationId: image.allocationId,
        printRequestId: image.grouping!.printRequestId,
        requestName: image.grouping!.requestName,
        customerId: image.grouping!.customerId,
        isInternal: image.grouping!.isInternal,
        quantity: image.quantity,
        widthPx: image.targetWidthPx,
        heightPx: image.targetHeightPx,
      })),
      sheetWidthPx: SHEET_WIDTH_PX,
      spacingPx: SPACING,
      maxSheetHeightPx: MAX_SHEET_HEIGHT_PX,
    });

    const composed = await composeGroupedGangSheetSheets({
      request,
      resizedByAllocationId,
      sheetWidthPx: SHEET_WIDTH_PX,
      spacingPx: SPACING,
      maxSheetHeightPx: MAX_SHEET_HEIGHT_PX,
      warnings: [],
    });

    assert.equal(composed.length, 2);
    assert.equal(composed.length, compositorCount);
  });
});
