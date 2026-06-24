import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MIN_SMALL_FORMAT_PRINT_WIDTH_INCHES,
  TARGET_PRINT_DPI,
} from "../constants/printSize.constants";
import {
  assessPrintSizeCapability,
  calculateEffectiveDpi,
  calculatePrintSizeAtTargetDpi,
  preserveAspectRatioFromHeight,
  preserveAspectRatioFromWidth,
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
  });
});

describe("assessPrintSizeCapability — production tiers", () => {
  it("B. treats 3000 px wide as preferred accept at 300 DPI (10 inches)", () => {
    const result = assessPrintSizeCapability(3000, 1500, TARGET_PRINT_DPI);

    assert.equal(result.success, true);
    if (!result.success) {
      return;
    }

    assert.equal(result.assessment.acceptanceLevel, "accept");
    assert.equal(result.assessment.suggestedPrintWidthInches, 10);
    assert.equal(result.assessment.meetsPreferredWidth, true);
  });

  it("C. treats 2400 px wide as standard apparel warning at 300 DPI (8 inches)", () => {
    const result = assessPrintSizeCapability(2400, 2400, TARGET_PRINT_DPI);

    assert.equal(result.success, true);
    if (!result.success) {
      return;
    }

    assert.equal(result.assessment.acceptanceLevel, "warn");
    assert.equal(result.assessment.meetsStandardApparelWidth, true);
    assert.equal(result.assessment.meetsPreferredWidth, false);
    assert.equal(result.assessment.suggestedPrintWidthInches, 8);
  });

  it("D. treats 1600 px wide as small-format acceptable at 300 DPI (~5.33 inches)", () => {
    const result = assessPrintSizeCapability(1600, 800, TARGET_PRINT_DPI);

    assert.equal(result.success, true);
    if (!result.success) {
      return;
    }

    assert.equal(result.assessment.acceptanceLevel, "small_format");
    assert.equal(result.assessment.meetsSmallFormatMinimum, true);
    assert.equal(result.assessment.meetsStandardApparelWidth, false);
    assert.equal(result.assessment.suggestedPrintWidthInches, 5.33);
  });

  it("E. treats 1050 px wide as minimum small-format threshold at 300 DPI (3.5 inches)", () => {
    const result = assessPrintSizeCapability(1050, 1050, TARGET_PRINT_DPI);

    assert.equal(result.success, true);
    if (!result.success) {
      return;
    }

    assert.equal(result.assessment.acceptanceLevel, "small_format");
    assert.equal(result.assessment.suggestedPrintWidthInches, MIN_SMALL_FORMAT_PRINT_WIDTH_INCHES);
  });

  it("F. rejects when max printable width is below 3.5 inches at 300 DPI", () => {
    const result = assessPrintSizeCapability(1049, 500, TARGET_PRINT_DPI);

    assert.equal(result.success, true);
    if (!result.success) {
      return;
    }

    assert.equal(result.assessment.acceptanceLevel, "reject");
    assert.equal(result.assessment.meetsSmallFormatMinimum, false);
  });

  it("warns when width is below 10 inches but at least 8 inches at 300 DPI", () => {
    const result = assessPrintSizeCapability(2999, 1500, TARGET_PRINT_DPI);

    assert.equal(result.success, true);
    if (!result.success) {
      return;
    }

    assert.equal(result.assessment.acceptanceLevel, "warn");
    assert.ok(result.assessment.maxPrintWidthInchesAtTarget > 9.99);
    assert.ok(result.assessment.maxPrintWidthInchesAtTarget < 10);
  });

  it("G. mixed batch — only below-minimum files are rejected", () => {
    const batchWidths = [10800, 3000, 2400, 1600, 1050, 1049];
    const expectedLevels = ["accept", "accept", "warn", "small_format", "small_format", "reject"] as const;

    const results = batchWidths.map((width) => {
      const assessment = assessPrintSizeCapability(width, width, TARGET_PRINT_DPI);
      assert.equal(assessment.success, true);
      return assessment.success ? assessment.assessment.acceptanceLevel : "reject";
    });

    assert.deepEqual(results, [...expectedLevels]);

    const rejected = results.filter((level) => level === "reject");
    assert.equal(rejected.length, 1);
  });
});

describe("preserveAspectRatioFromWidth", () => {
  it("preserves aspect ratio when width is edited", () => {
    const result = preserveAspectRatioFromWidth(10, 10800, 9000);

    assert.equal(result.success, true);
    if (!result.success) {
      return;
    }

    assert.equal(result.printWidthInches, 10);
    assert.equal(result.printHeightInches, 8.33);
  });
});

describe("preserveAspectRatioFromHeight", () => {
  it("preserves aspect ratio when height is edited", () => {
    const result = preserveAspectRatioFromHeight(30, 10800, 9000);

    assert.equal(result.success, true);
    if (!result.success) {
      return;
    }

    assert.equal(result.printHeightInches, 30);
    assert.equal(result.printWidthInches, 36);
  });
});

describe("invalid inputs", () => {
  it("rejects zero and negative values safely", () => {
    assert.equal(calculatePrintSizeAtTargetDpi(0, 9000).success, false);
    assert.equal(calculatePrintSizeAtTargetDpi(-100, 9000).success, false);
    assert.equal(calculatePrintSizeAtTargetDpi(10800, 0).success, false);
    assert.equal(assessPrintSizeCapability(0, 9000).success, false);
    assert.equal(preserveAspectRatioFromWidth(0, 10800, 9000).success, false);
    assert.equal(preserveAspectRatioFromHeight(-5, 10800, 9000).success, false);
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
