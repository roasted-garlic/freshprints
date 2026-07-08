import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildExportImageFilename,
  buildExportZipFilename,
  buildGangSheetBaseFileName,
  buildGangSheetFilename,
  buildGangSheetSheetLabel,
  computeExportTargetPixelSize,
  formatExportZipDateTime,
  formatInchesForFilename,
  sanitizeFilenameSegment,
  withMultiplyByQuantitySuffix,
} from "./showExportFilename";

describe("formatExportZipDateTime", () => {
  it("formats a date as MM-DD-YYYY using local date components", () => {
    const date = new Date(2026, 6, 6, 14, 0);
    assert.equal(formatExportZipDateTime(date), "07-06-2026");
  });

  it("pads single-digit month and day", () => {
    const date = new Date(2026, 0, 5, 9, 5);
    assert.equal(formatExportZipDateTime(date), "01-05-2026");
  });

  it("omits time of day", () => {
    const morning = new Date(2026, 6, 6, 9, 5);
    const evening = new Date(2026, 6, 6, 21, 45);
    assert.equal(formatExportZipDateTime(morning), formatExportZipDateTime(evening));
  });
});

describe("buildExportZipFilename", () => {
  it("builds the whatnot_<date>.zip filename from the show's scheduled date/time", () => {
    const date = new Date(2026, 6, 6, 14, 0);
    assert.equal(buildExportZipFilename(date), "whatnot_07-06-2026.zip");
  });
});

describe("buildGangSheetBaseFileName", () => {
  it("builds the unsuffixed, unnumbered base name from the show's scheduled date/time", () => {
    const date = new Date(2026, 6, 6, 14, 0);
    assert.equal(buildGangSheetBaseFileName(date), "whatnot_07-06-2026_gang-sheet");
  });
});

describe("buildGangSheetFilename", () => {
  it("adds a _1-of-1 suffix when there is only one sheet", () => {
    assert.equal(
      buildGangSheetFilename("whatnot_07-06-2026_gang-sheet", 1, 1),
      "whatnot_07-06-2026_gang-sheet_1-of-1.png",
    );
  });

  it("adds a _{n}-of-{m} suffix when there are multiple sheets", () => {
    assert.equal(
      buildGangSheetFilename("whatnot_07-06-2026_gang-sheet", 1, 3),
      "whatnot_07-06-2026_gang-sheet_1-of-3.png",
    );
    assert.equal(
      buildGangSheetFilename("whatnot_07-06-2026_gang-sheet", 2, 3),
      "whatnot_07-06-2026_gang-sheet_2-of-3.png",
    );
  });
});

describe("buildGangSheetSheetLabel", () => {
  it("builds a single-sheet label", () => {
    assert.equal(buildGangSheetSheetLabel("whatnot_07-06-2026_gang-sheet", 1, 1), "whatnot_07-06-2026_gang-sheet — 1 of 1");
  });

  it("builds a multi-sheet label", () => {
    assert.equal(buildGangSheetSheetLabel("whatnot_07-06-2026_gang-sheet", 2, 3), "whatnot_07-06-2026_gang-sheet — 2 of 3");
  });
});

describe("sanitizeFilenameSegment", () => {
  it("lowercases and hyphenates spaces", () => {
    assert.equal(sanitizeFilenameSegment("Design Title"), "design-title");
  });

  it("strips unsafe characters", () => {
    assert.equal(sanitizeFilenameSegment("Design: Title/Special?"), "design-titlespecial");
  });

  it("collapses repeated hyphens and trims leading/trailing hyphens", () => {
    assert.equal(sanitizeFilenameSegment("  --Design---Title--  "), "design-title");
  });

  it("falls back to 'design' when nothing usable remains", () => {
    assert.equal(sanitizeFilenameSegment("😀🎉"), "design");
  });
});

describe("formatInchesForFilename", () => {
  it("trims unnecessary trailing zeros", () => {
    assert.equal(formatInchesForFilename(10), "10");
    assert.equal(formatInchesForFilename(10.0), "10");
  });

  it("keeps meaningful decimals rounded to two places", () => {
    assert.equal(formatInchesForFilename(8.333333), "8.33");
  });
});

describe("buildExportImageFilename", () => {
  it("builds the full per-image filename in the documented format", () => {
    const filename = buildExportImageFilename({
      sequenceNumber: 1,
      allocatedQuantity: 2,
      printWidthInches: 10,
      printHeightInches: 8.333333,
      designTitle: "Design Title",
      allocationId: "abc123xyz",
    });

    assert.equal(filename, "001_QTY-2_10x8.33_design-title_alloc-abc123.png");
  });

  it("pads the sequence number to 3 digits", () => {
    const filename = buildExportImageFilename({
      sequenceNumber: 42,
      allocatedQuantity: 1,
      printWidthInches: 4,
      printHeightInches: 4,
      designTitle: "Sample",
      allocationId: "xyz789",
    });

    assert.ok(filename.startsWith("042_"));
  });
});

describe("withMultiplyByQuantitySuffix", () => {
  it("replaces the QTY-{n} segment with {copyNumber}of{copyCount}", () => {
    const fileName = "001_QTY-2_10x8.33_design-title_alloc-abc123.png";

    assert.equal(
      withMultiplyByQuantitySuffix(fileName, 1, 2),
      "001_1of2_10x8.33_design-title_alloc-abc123.png",
    );
    assert.equal(
      withMultiplyByQuantitySuffix(fileName, 2, 2),
      "001_2of2_10x8.33_design-title_alloc-abc123.png",
    );
  });

  it("handles double-digit quantities and copy counts", () => {
    const fileName = "004_QTY-12_10x8.33_design-title_alloc-abc123.png";

    assert.equal(
      withMultiplyByQuantitySuffix(fileName, 9, 12),
      "004_9of12_10x8.33_design-title_alloc-abc123.png",
    );
  });
});

describe("computeExportTargetPixelSize", () => {
  it("computes target pixel size at 300 DPI", () => {
    const result = computeExportTargetPixelSize(10, 8, 5000, 5000);
    assert.equal(result.targetWidthPx, 3000);
    assert.equal(result.targetHeightPx, 2400);
  });

  it("flags needsUpscale when the source has fewer pixels than the target width", () => {
    const result = computeExportTargetPixelSize(10, 8, 2000, 5000);
    assert.equal(result.needsUpscale, true);
  });

  it("flags needsUpscale when the source has fewer pixels than the target height", () => {
    const result = computeExportTargetPixelSize(10, 8, 5000, 1000);
    assert.equal(result.needsUpscale, true);
  });

  it("does not flag needsUpscale when the source meets or exceeds the target", () => {
    const result = computeExportTargetPixelSize(10, 8, 3000, 2400);
    assert.equal(result.needsUpscale, false);
  });
});
