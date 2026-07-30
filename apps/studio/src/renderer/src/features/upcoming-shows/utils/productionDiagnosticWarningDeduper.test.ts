import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ProductionDiagnosticWarningDeduper } from "./productionDiagnosticWarningDeduper";

describe("production diagnostic warning dedupe", () => {
  it("emits an identical field-only diagnostic once and allows a changed diagnostic", () => {
    const deduper = new ProductionDiagnosticWarningDeduper();
    assert.equal(deduper.shouldEmit("showAllocations/opaque-1", ["updatedAt"], []), true);
    assert.equal(deduper.shouldEmit("showAllocations/opaque-1", ["updatedAt"], []), false);
    assert.equal(
      deduper.shouldEmit("showAllocations/opaque-1", ["updatedAt", "status"], []),
      true,
    );
  });
});
