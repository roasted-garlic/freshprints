import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { applyStandardPrintSizePreset } from "./applyStandardPrintSizePreset";

describe("applyStandardPrintSizePreset", () => {
  it("locks height from preset width using artwork aspect ratio", () => {
    const result = applyStandardPrintSizePreset({
      presetWidthInches: 11,
      pixelWidth: 3300,
      pixelHeight: 3300,
    });

    assert.equal(result.printWidthInches, 11);
    assert.equal(result.printHeightInches, 11);
    assert.equal(result.assessment.canSave, true);
  });

  it("preserves portrait aspect ratio for non-square artwork", () => {
    const result = applyStandardPrintSizePreset({
      presetWidthInches: 11,
      pixelWidth: 3300,
      pixelHeight: 4950,
    });

    assert.equal(result.printWidthInches, 11);
    assert.equal(result.printHeightInches, 16.5);
    assert.equal(result.assessment.canSave, true);
  });

  it("blocks when resulting size fails save assessment", () => {
    const result = applyStandardPrintSizePreset({
      presetWidthInches: 24,
      pixelWidth: 100,
      pixelHeight: 100,
    });

    assert.equal(result.assessment.canSave, false);
    assert.ok(result.assessment.errorMessage);
  });
});
