import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MIN_ACCEPTABLE_EFFECTIVE_DPI,
  MIN_SMALL_FORMAT_PRINT_WIDTH_INCHES,
  TARGET_PRINT_DPI,
} from "../constants/printSize.constants";
import {
  assessPrintSizeCapability,
  calculateEffectiveDpi,
  calculatePrintSizeAtTargetDpi,
  getImportUpscaleScaleFactor,
  isImportUpscaleSoftQuality,
  resolveImportNormalizationTargetDpi,
  resolveImportUpscaleTargetPx,
} from "./printSizeMath";

describe("calculatePrintSizeAtTargetDpi", () => {
  it("A. maps 10800 px wide at 300 DPI to 36 inches (preferred accept)", () => {
    const result = calculatePrintSizeAtTargetDpi(10800, 9000, TARGET_PRINT_DPI);

    assert.equal(result.success, true);
    if (!result.success) {
      return;
    }

    assert.equal(result.printWidthInches, 36);
    assert.equal(result.printHeightInches, 30);

    const assessment = assessPrintSizeCapability(10800, 9000, TARGET_PRINT_DPI);
    assert.equal(assessment.success, true);
    if (!assessment.success) {
      return;
    }

    assert.equal(assessment.assessment.acceptanceLevel, "accept");
    assert.equal(assessment.assessment.meetsPreferredWidth, true);
    assert.equal(assessment.assessment.suggestedEffectiveDpi, 300);
  });
});

describe("resolveImportNormalizationTargetDpi", () => {
  it("uses 300 DPI when width at 300 meets small-format threshold", () => {
    assert.equal(resolveImportNormalizationTargetDpi(1050), TARGET_PRINT_DPI);
  });

  it("uses 72 DPI when width at 300 is below small-format threshold", () => {
    assert.equal(resolveImportNormalizationTargetDpi(1049), MIN_ACCEPTABLE_EFFECTIVE_DPI);
  });
});

describe("assessPrintSizeCapability — effective DPI import floor", () => {
  it("B. treats 3000 px wide as optimal accept at 300 DPI normalization", () => {
    const result = assessPrintSizeCapability(3000, 1500, TARGET_PRINT_DPI);

    assert.equal(result.success, true);
    if (!result.success) {
      return;
    }

    assert.equal(result.assessment.acceptanceLevel, "accept");
    assert.equal(result.assessment.targetDpi, TARGET_PRINT_DPI);
    assert.equal(result.assessment.suggestedPrintWidthInches, 10);
    assert.equal(result.assessment.suggestedEffectiveDpi, 300);
  });

  it("C. treats 2400 px wide as optimal at 300 DPI normalization", () => {
    const result = assessPrintSizeCapability(2400, 2400, TARGET_PRINT_DPI);

    assert.equal(result.success, true);
    if (!result.success) {
      return;
    }

    assert.equal(result.assessment.acceptanceLevel, "accept");
    assert.equal(result.assessment.suggestedEffectiveDpi, 300);
  });

  it("D. treats 1600 px wide as optimal at 300 DPI normalization", () => {
    const result = assessPrintSizeCapability(1600, 800, TARGET_PRINT_DPI);

    assert.equal(result.success, true);
    if (!result.success) {
      return;
    }

    assert.equal(result.assessment.acceptanceLevel, "accept");
    assert.equal(result.assessment.suggestedEffectiveDpi, 300);
  });

  it("E. treats 1050 px wide as optimal at 300 DPI normalization", () => {
    const result = assessPrintSizeCapability(1050, 1050, TARGET_PRINT_DPI);

    assert.equal(result.success, true);
    if (!result.success) {
      return;
    }

    assert.equal(result.assessment.acceptanceLevel, "accept");
    assert.equal(result.assessment.suggestedPrintWidthInches, MIN_SMALL_FORMAT_PRINT_WIDTH_INCHES);
    assert.equal(result.assessment.suggestedEffectiveDpi, 300);
  });

  it("F. accepts 1049 px wide with 72 DPI normalization and terrible tier", () => {
    const result = assessPrintSizeCapability(1049, 500, TARGET_PRINT_DPI);

    assert.equal(result.success, true);
    if (!result.success) {
      return;
    }

    assert.equal(result.assessment.acceptanceLevel, "terrible");
    assert.equal(result.assessment.targetDpi, MIN_ACCEPTABLE_EFFECTIVE_DPI);
    assert.equal(result.assessment.suggestedEffectiveDpi, 72);
    assert.equal(result.assessment.meetsSmallFormatMinimum, false);
  });

  it("rejects when limiting pixel dimension is below 72", () => {
    const result = assessPrintSizeCapability(1049, 71, TARGET_PRINT_DPI);

    assert.equal(result.success, true);
    if (!result.success) {
      return;
    }

    assert.equal(result.assessment.acceptanceLevel, "reject");
  });

  it("rejects 71×71 px assets", () => {
    const result = assessPrintSizeCapability(71, 71, TARGET_PRINT_DPI);

    assert.equal(result.success, true);
    if (!result.success) {
      return;
    }

    assert.equal(result.assessment.acceptanceLevel, "reject");
  });

  it("G. mixed batch — only below-minimum pixel dimensions are rejected", () => {
    const batch = [
      { width: 10800, height: 10800 },
      { width: 3000, height: 1500 },
      { width: 2400, height: 2400 },
      { width: 1600, height: 800 },
      { width: 1050, height: 1050 },
      { width: 1049, height: 500 },
      { width: 71, height: 71 },
    ] as const;
    const expectedLevels = [
      "accept",
      "accept",
      "accept",
      "accept",
      "accept",
      "terrible",
      "reject",
    ] as const;

    const results = batch.map(({ width, height }) => {
      const assessment = assessPrintSizeCapability(width, height, TARGET_PRINT_DPI);
      assert.equal(assessment.success, true);
      return assessment.success ? assessment.assessment.acceptanceLevel : "reject";
    });

    assert.deepEqual(results, [...expectedLevels]);

    const rejected = results.filter((level) => level === "reject");
    assert.equal(rejected.length, 1);
  });
});

describe("invalid inputs", () => {
  it("rejects zero and negative values safely", () => {
    assert.equal(calculatePrintSizeAtTargetDpi(0, 9000).success, false);
    assert.equal(calculatePrintSizeAtTargetDpi(-100, 9000).success, false);
    assert.equal(calculatePrintSizeAtTargetDpi(10800, 0).success, false);
    assert.equal(assessPrintSizeCapability(0, 9000).success, false);
    assert.equal(calculateEffectiveDpi(10800, 9000, 0, 30).success, false);
    assert.equal(calculateEffectiveDpi(10800, 9000, 36, -1).success, false);
  });
});

describe("calculateEffectiveDpi", () => {
  it("uses width axis when aspect ratio is locked", () => {
    const result = calculateEffectiveDpi(10800, 9000, 36, 30, true);

    assert.equal(result.success, true);
    if (!result.success) {
      return;
    }

    assert.equal(result.effectiveDpi, 300);
    assert.equal(result.limitingAxis, undefined);
  });

  it("uses limiting axis when aspect ratio is unlocked", () => {
    const result = calculateEffectiveDpi(10800, 9000, 40, 30, false);

    assert.equal(result.success, true);
    if (!result.success) {
      return;
    }

    assert.equal(result.effectiveDpi, 270);
    assert.equal(result.limitingAxis, "width");
  });
});

describe("resolveImportUpscaleTargetPx", () => {
  it("returns null when width already meets the 4500px (15in @ 300dpi) target", () => {
    assert.equal(resolveImportUpscaleTargetPx(4500, 4000), null);
  });

  it("returns null when width exceeds the target", () => {
    assert.equal(resolveImportUpscaleTargetPx(5000, 3000), null);
  });

  it("returns a scaled-up target preserving aspect ratio when width is below target", () => {
    const result = resolveImportUpscaleTargetPx(1500, 2000);

    assert.deepEqual(result, { widthPx: 4500, heightPx: 6000 });
  });

  it("handles a non-square aspect ratio correctly", () => {
    const result = resolveImportUpscaleTargetPx(1000, 300);

    assert.deepEqual(result, { widthPx: 4500, heightPx: 1350 });
  });

  it("upscales a 10in @ 300dpi (3000px) image once to the 15in headroom target", () => {
    const result = resolveImportUpscaleTargetPx(3000, 3000);

    assert.deepEqual(result, { widthPx: 4500, heightPx: 4500 });
  });

  it("treats exactly 4499px as needing upscale and 4500px as not (boundary)", () => {
    assert.deepEqual(resolveImportUpscaleTargetPx(4499, 4499), { widthPx: 4500, heightPx: 4500 });
    assert.equal(resolveImportUpscaleTargetPx(4500, 4500), null);
  });

  it("supports custom target DPI/width overrides", () => {
    const result = resolveImportUpscaleTargetPx(500, 500, 150, 4);

    assert.deepEqual(result, { widthPx: 600, heightPx: 600 });
  });
});

describe("isImportUpscaleSoftQuality", () => {
  it("does not flag a mild 10in→15in (~1.5×) upscale", () => {
    assert.equal(isImportUpscaleSoftQuality(3000, 4500), false);
    assert.equal(getImportUpscaleScaleFactor(3000, 4500), 1.5);
  });

  it("flags a 4in→15in (~3.75×) upscale as soft quality", () => {
    assert.equal(isImportUpscaleSoftQuality(1200, 4500), true);
    assert.ok((getImportUpscaleScaleFactor(1200, 4500) ?? 0) >= 3);
  });

  it("treats exact 3× as soft quality and just under as not", () => {
    assert.equal(isImportUpscaleSoftQuality(1500, 4500), true);
    assert.equal(isImportUpscaleSoftQuality(1501, 4500), false);
  });

  it("returns null/false for invalid or non-enlarging dimensions", () => {
    assert.equal(getImportUpscaleScaleFactor(0, 4500), null);
    assert.equal(getImportUpscaleScaleFactor(4500, 3000), null);
    assert.equal(isImportUpscaleSoftQuality(4500, 4500), false);
  });
});
