import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assessPrintRequestItemSize,
  calculateLockedHeightFromWidth,
  calculateLockedWidthFromHeight,
  resolveDefaultPrintRequestItemSizeSelection,
  resolveInitialPrintRequestItemSize,
  resolvePrintRequestDefaultWidthInches,
  STANDARD_PRINT_REQUEST_INITIAL_WIDTH_INCHES,
} from "./printRequestItemSizing";

describe("assessPrintRequestItemSize", () => {
  it("blocks just below 200 DPI after rounding", () => {
    const result = assessPrintRequestItemSize({
      pixelWidth: 1990,
      pixelHeight: 1990,
      printWidthInches: 10,
      printHeightInches: 10,
    });
    assert.equal(result.effectiveDpi, 199);
    assert.equal(result.canSave, false);
    assert.equal(result.qualityLevel, "below_minimum");
    assert.match(result.errorMessage ?? "", /200 DPI/);
  });

  it("warns but allows 200, 201, 250, and 299 DPI", () => {
    const cases = [
      { pixels: 2000, inches: 10, dpi: 200 },
      { pixels: 2010, inches: 10, dpi: 201 },
      { pixels: 2500, inches: 10, dpi: 250 },
      { pixels: 2990, inches: 10, dpi: 299 },
    ];

    for (const { pixels, inches, dpi } of cases) {
      const result = assessPrintRequestItemSize({
        pixelWidth: pixels,
        pixelHeight: pixels,
        printWidthInches: inches,
        printHeightInches: inches,
      });
      assert.equal(result.effectiveDpi, dpi, `expected ${dpi} DPI at ${pixels}px / ${inches}"`);
      assert.equal(result.canSave, true, `expected saveable at ${dpi} DPI`);
      assert.equal(result.qualityLevel, "good");
      assert.equal(
        result.warningMessage,
        "Requested size is below 300 DPI. It can be printed, but quality may be reduced.",
      );
    }
  });

  it("treats 300+ DPI as optimal with no warning", () => {
    const result = assessPrintRequestItemSize({
      pixelWidth: 3000,
      pixelHeight: 3000,
      printWidthInches: 10,
      printHeightInches: 10,
    });
    assert.equal(result.canSave, true);
    assert.equal(result.qualityLevel, "optimal");
    assert.equal(result.warningMessage, undefined);
  });

  it("allows Painkiller 14 × 21.1 at ~308 DPI and does not emit the 10.95 × 16.5 envelope error", () => {
    const pixelWidth = 4312;
    const pixelHeight = 6499;
    const printWidthInches = 14;
    const printHeightInches = calculateLockedHeightFromWidth(pixelWidth, pixelHeight, printWidthInches);

    assert.equal(printHeightInches, 21.1);

    const result = assessPrintRequestItemSize({
      pixelWidth,
      pixelHeight,
      printWidthInches,
      printHeightInches,
      approvedMaxPrintWidthInches: 10.95,
      approvedMaxPrintHeightInches: 16.5,
    });

    assert.equal(result.canSave, true);
    assert.ok(result.effectiveDpi >= 300);
    assert.equal(result.qualityLevel, "optimal");
    assert.equal(result.errorMessage, undefined);
    assert.doesNotMatch(result.errorMessage ?? "", /10\.95/);
    assert.doesNotMatch(result.warningMessage ?? "", /10\.95/);
  });

  it("still allows a size the ADR-FP-080 envelope would have capped when DPI stays at or above 200", () => {
    // 1000px → ~3.33″ approved max @ 300 DPI. 4″ is 250 DPI and must remain saveable.
    const result = assessPrintRequestItemSize({
      pixelWidth: 1000,
      pixelHeight: 1000,
      printWidthInches: 4,
      printHeightInches: 4,
      approvedMaxPrintWidthInches: 3.33,
      approvedMaxPrintHeightInches: 3.33,
    });
    assert.equal(result.canSave, true);
    assert.equal(result.qualityLevel, "good");
    assert.equal(result.errorMessage, undefined);
  });

  it("blocks 22.1″ at 400 DPI on the physical cap", () => {
    const result = assessPrintRequestItemSize({
      pixelWidth: 8840,
      pixelHeight: 8840,
      printWidthInches: 22.1,
      printHeightInches: 22.1,
    });
    assert.equal(result.canSave, false);
    assert.match(result.errorMessage ?? "", /22 inches/);
  });

  it("blocks 199 DPI at 5″", () => {
    const result = assessPrintRequestItemSize({
      pixelWidth: 995,
      pixelHeight: 995,
      printWidthInches: 5,
      printHeightInches: 5,
    });
    assert.equal(result.canSave, false);
    assert.equal(result.qualityLevel, "below_minimum");
  });

  it("uses catalog and upload pixel inputs the same way", () => {
    const catalog = assessPrintRequestItemSize({
      pixelWidth: 3000,
      pixelHeight: 1500,
      printWidthInches: 10,
      printHeightInches: 5,
    });
    const upload = assessPrintRequestItemSize({
      pixelWidth: 3000,
      pixelHeight: 1500,
      printWidthInches: 10,
      printHeightInches: 5,
    });
    assert.equal(catalog.canSave, upload.canSave);
    assert.equal(catalog.effectiveDpi, upload.effectiveDpi);
    assert.equal(catalog.qualityLevel, "optimal");
  });

  it("locks aspect from width-only and height-only without cumulative drift", () => {
    const pixelWidth = 4312;
    const pixelHeight = 6499;
    const heightFromWidth = calculateLockedHeightFromWidth(pixelWidth, pixelHeight, 14);
    const widthFromHeight = calculateLockedWidthFromHeight(pixelWidth, pixelHeight, heightFromWidth);
    assert.equal(heightFromWidth, 21.1);
    assert.equal(widthFromHeight, 14);
  });
});

describe("resolvePrintRequestDefaultWidthInches", () => {
  it("falls back to 11 inches when setting is absent", () => {
    assert.equal(resolvePrintRequestDefaultWidthInches({}), 11);
    assert.equal(resolvePrintRequestDefaultWidthInches(undefined), 11);
    assert.equal(STANDARD_PRINT_REQUEST_INITIAL_WIDTH_INCHES, 11);
  });

  it("resolves 10, 10.5, 11, and 11.5 when valid", () => {
    assert.equal(
      resolvePrintRequestDefaultWidthInches({ defaultPrintRequestWidthInches: 10 }),
      10,
    );
    assert.equal(
      resolvePrintRequestDefaultWidthInches({ defaultPrintRequestWidthInches: 10.5 }),
      10.5,
    );
    assert.equal(
      resolvePrintRequestDefaultWidthInches({ defaultPrintRequestWidthInches: 11 }),
      11,
    );
    assert.equal(
      resolvePrintRequestDefaultWidthInches({ defaultPrintRequestWidthInches: 11.5 }),
      11.5,
    );
  });

  it("falls back when persisted value is invalid", () => {
    assert.equal(
      resolvePrintRequestDefaultWidthInches({ defaultPrintRequestWidthInches: -1 }),
      11,
    );
    assert.equal(
      resolvePrintRequestDefaultWidthInches({ defaultPrintRequestWidthInches: 99 }),
      11,
    );
  });
});

describe("resolveInitialPrintRequestItemSize runtime default", () => {
  const legacyDesign = {
    pixelWidth: 3600,
    pixelHeight: 1800,
    defaultPrintWidthInches: 10,
  };

  it("uses configured runtime default instead of hardcoded 11 only as fallback", () => {
    const atDefault = resolveInitialPrintRequestItemSize({
      ...legacyDesign,
      printRequestDefaultWidthInches: 11,
    });
    const atTenFive = resolveInitialPrintRequestItemSize({
      ...legacyDesign,
      printRequestDefaultWidthInches: 10.5,
    });
    assert.equal(atDefault.printWidthInches, 11);
    assert.equal(atTenFive.printWidthInches, 10.5);
  });

  it("does not force invalid sizes when runtime default exceeds DPI safety", () => {
    const size = resolveInitialPrintRequestItemSize({
      pixelWidth: 2000,
      pixelHeight: 2000,
      defaultPrintWidthInches: 10,
      printRequestDefaultWidthInches: 11.5,
    });
    assert.ok(size.printWidthInches < 11.5);
    const assessment = assessPrintRequestItemSize({
      pixelWidth: 2000,
      pixelHeight: 2000,
      printWidthInches: size.printWidthInches,
      printHeightInches: size.printHeightInches,
    });
    assert.equal(assessment.canSave, true);
    assert.ok(assessment.effectiveDpi >= 200);
  });
});

describe("resolveDefaultPrintRequestItemSizeSelection", () => {
  it("returns configured default width with save assessment", () => {
    const selection = resolveDefaultPrintRequestItemSizeSelection({
      pixelWidth: 3600,
      pixelHeight: 1800,
      printRequestDefaultWidthInches: 10.5,
    });
    assert.ok(selection);
    assert.equal(selection.configuredDefaultWidthInches, 10.5);
    assert.equal(selection.printWidthInches, 10.5);
    assert.equal(selection.assessment.canSave, true);
  });
});
