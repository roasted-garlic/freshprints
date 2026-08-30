import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validateGenerateGangSheetPngRequest } from "./exportRequestValidation";

const baseImage = {
  allocationId: "alloc-1",
  downloadUrl: "https://firebasestorage.googleapis.com/v0/b/example/o/design.png?alt=media",
  targetWidthPx: 900,
  targetHeightPx: 900,
  fileName: "design.png",
  quantity: 1,
  grouping: {
    printRequestId: "req-1",
    requestName: "roasted_garlic-CR001",
    customerId: "cust-1",
    isInternal: false,
  },
};

const basePayload = {
  showId: "show-1",
  baseFileName: "whatnot_08-24-2026_gang-sheet",
  sheetWidthInches: 23,
  sideMarginInches: 0.25,
  topBottomMarginInches: 0.5,
  gutterInches: 0.5,
  maxSheetLengthInches: 300,
  labelFontSizePx: 120,
  images: [baseImage],
};

describe("validateGenerateGangSheetPngRequest", () => {
  it("preserves grouped_by_customer layoutMode and image grouping", () => {
    const validated = validateGenerateGangSheetPngRequest({
      ...basePayload,
      layoutMode: "grouped_by_customer",
    });

    assert.ok("request" in validated);
    assert.equal(validated.request.layoutMode, "grouped_by_customer");
    assert.deepEqual(validated.request.images[0]?.grouping, baseImage.grouping);
  });

  it("omits layoutMode for standard efficiency generates", () => {
    const validated = validateGenerateGangSheetPngRequest(basePayload);

    assert.ok("request" in validated);
    assert.equal(validated.request.layoutMode, undefined);
  });

  it("preserves customer_grouped_continuous layoutMode and image grouping", () => {
    const validated = validateGenerateGangSheetPngRequest({
      ...basePayload,
      layoutMode: "customer_grouped_continuous",
      baseFileName: "whatnot_08-24-2026_grouped-continuous-gang-sheet",
    });

    assert.ok("request" in validated);
    assert.equal(validated.request.layoutMode, "customer_grouped_continuous");
    assert.deepEqual(validated.request.images[0]?.grouping, baseImage.grouping);
  });

  it("rejects grouped mode when any image is missing grouping metadata", () => {
    const validated = validateGenerateGangSheetPngRequest({
      ...basePayload,
      layoutMode: "grouped_by_customer",
      images: [{ ...baseImage, grouping: undefined }],
    });

    assert.ok("error" in validated);

    const continuousValidated = validateGenerateGangSheetPngRequest({
      ...basePayload,
      layoutMode: "customer_grouped_continuous",
      images: [{ ...baseImage, grouping: undefined }],
    });

    assert.ok("error" in continuousValidated);
  });
});
