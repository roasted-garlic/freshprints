import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { assessPrintSizeCapability } from "./printSizeMath";
import { buildImportPrintSizeCreateFields } from "./importPrintSizeMetadata";

describe("buildImportPrintSizeCreateFields", () => {
  it("builds normalized fields for a large image", () => {
    const assessmentResult = assessPrintSizeCapability(10800, 9000);

    assert.equal(assessmentResult.success, true);
    if (!assessmentResult.success) {
      return;
    }

    const fields = buildImportPrintSizeCreateFields({
      pixelWidth: 10800,
      pixelHeight: 9000,
      assessment: assessmentResult.assessment,
      metadataDpiX: 72,
      metadataDpiY: 72,
    });

    assert.notEqual("error" in fields, true);
    if ("error" in fields) {
      return;
    }

    assert.equal(fields.printWidthInches, 36);
    assert.equal(fields.printHeightInches, 30);
    assert.equal(fields.effectiveDpi, 300);
    assert.equal(fields.printAspectRatioLocked, true);
    assert.equal(fields.printSizeSource, "import_normalized");
    assert.equal(fields.metadataDpiX, 72);
    assert.equal(fields.metadataDpiY, 72);
  });

  it("rejects when assessment level is reject", () => {
    const assessmentResult = assessPrintSizeCapability(1049, 500);

    assert.equal(assessmentResult.success, true);
    if (!assessmentResult.success) {
      return;
    }

    assert.equal(assessmentResult.assessment.acceptanceLevel, "reject");

    const fields = buildImportPrintSizeCreateFields({
      pixelWidth: 1049,
      pixelHeight: 500,
      assessment: assessmentResult.assessment,
    });

    assert.equal("error" in fields, true);
  });
});
