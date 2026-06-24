import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { TARGET_PRINT_DPI } from "../constants/printSize.constants";
import { resolveDesignPrintSizeForDisplay } from "./designPrintSizeState";

describe("resolveDesignPrintSizeForDisplay", () => {
  it("F. uses legacy fallback when print fields are missing", () => {
    const resolved = resolveDesignPrintSizeForDisplay({
      width: 10800,
      height: 9000,
    });

    assert.notEqual(resolved, null);
    if (!resolved) {
      return;
    }

    assert.equal(resolved.printWidthInches, 36);
    assert.equal(resolved.printHeightInches, 30);
    assert.equal(resolved.printAspectRatioLocked, true);
    assert.equal(resolved.effectiveDpi, TARGET_PRINT_DPI);
    assert.equal(resolved.usesLegacyFallback, true);
  });

  it("returns stored print fields when present", () => {
    const resolved = resolveDesignPrintSizeForDisplay({
      width: 3000,
      height: 1500,
      printWidthInches: 12,
      printHeightInches: 6,
      printAspectRatioLocked: true,
      effectiveDpi: 250,
      printSizeSource: "import_normalized",
    });

    assert.notEqual(resolved, null);
    if (!resolved) {
      return;
    }

    assert.equal(resolved.printWidthInches, 12);
    assert.equal(resolved.effectiveDpi, 250);
    assert.equal(resolved.usesLegacyFallback, false);
  });

  it("returns null when pixel dimensions are missing", () => {
    assert.equal(resolveDesignPrintSizeForDisplay({}), null);
  });
});
