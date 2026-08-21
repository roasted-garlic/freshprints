import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assessPrintRequestItemSize,
  resolveInitialPrintRequestItemSize,
} from "@fresh-prints/shared/utils/printRequestItemSizing";

describe("print request oversized selection initialization", () => {
  it("initializes an oversized catalog width to a standard 10 inch requested width", () => {
    const result = resolveInitialPrintRequestItemSize({
      pixelWidth: 3000,
      pixelHeight: 3500,
      defaultPrintWidthInches: 30,
    });

    assert.deepEqual(result, {
      printWidthInches: 10,
      printHeightInches: 11.67,
    });
    assert.equal(
      assessPrintRequestItemSize({
        pixelWidth: 3000,
        pixelHeight: 3500,
        ...result,
      }).canSave,
      true,
    );
  });

  it("keeps a smaller default width when that requested size is standard-valid", () => {
    const result = resolveInitialPrintRequestItemSize({
      pixelWidth: 2400,
      pixelHeight: 1200,
      defaultPrintWidthInches: 8,
    });

    assert.deepEqual(result, {
      printWidthInches: 8,
      printHeightInches: 4,
    });
  });

  it("caps extreme portrait aspect ratios so initialized height stays within 22 inches", () => {
    const result = resolveInitialPrintRequestItemSize({
      pixelWidth: 1000,
      pixelHeight: 4000,
      defaultPrintWidthInches: 30,
    });

    // 22″ height would be 5.5″ wide (~182 DPI). 200 DPI floor is 5″ × 20″, then ADR-FP-080
    // approved-max (~3.33″ at 300 DPI) still clamps the initial default.
    assert.deepEqual(result, {
      printWidthInches: 3.33,
      printHeightInches: 13.32,
    });
    assert.equal(
      assessPrintRequestItemSize({
        pixelWidth: 1000,
        pixelHeight: 4000,
        ...result,
      }).canSave,
      true,
    );
  });

  it("caps extreme landscape widths under the same 22 inch standard limit", () => {
    const result = resolveInitialPrintRequestItemSize({
      pixelWidth: 4000,
      pixelHeight: 1000,
      defaultPrintWidthInches: 30,
    });

    assert.deepEqual(result, {
      printWidthInches: 10,
      printHeightInches: 2.5,
    });
    assert.equal(
      assessPrintRequestItemSize({
        pixelWidth: 4000,
        pixelHeight: 1000,
        ...result,
      }).canSave,
      true,
    );
  });

  it("falls back to target-DPI width when catalog print width is missing", () => {
    const result = resolveInitialPrintRequestItemSize({
      pixelWidth: 3600,
      pixelHeight: 1800,
    });

    assert.deepEqual(result, {
      printWidthInches: 10,
      printHeightInches: 5,
    });
  });

  it("keeps edit/autosave validation blocking requested sizes over 22 inches", () => {
    const oversized = assessPrintRequestItemSize({
      pixelWidth: 9000,
      pixelHeight: 6000,
      printWidthInches: 30,
      printHeightInches: 20,
    });
    const resized = assessPrintRequestItemSize({
      pixelWidth: 9000,
      pixelHeight: 6000,
      printWidthInches: 22,
      printHeightInches: 14.67,
    });

    assert.equal(oversized.canSave, false);
    assert.match(oversized.errorMessage ?? "", /Custom Request/);
    assert.equal(resized.canSave, true);
  });

  it("does not mutate catalog design metadata used as initialization input", () => {
    const designPrintSize = {
      defaultPrintWidthInches: 30,
      defaultPrintHeightInches: 35,
    };

    resolveInitialPrintRequestItemSize({
      pixelWidth: 3000,
      pixelHeight: 3500,
      defaultPrintWidthInches: designPrintSize.defaultPrintWidthInches,
    });

    assert.deepEqual(designPrintSize, {
      defaultPrintWidthInches: 30,
      defaultPrintHeightInches: 35,
    });
  });
});
