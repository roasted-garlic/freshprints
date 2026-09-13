import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

function readFromFunctions(rel: string): string {
  return readFileSync(join(here, rel), "utf8");
}

describe("atomic AI reprocess state contract", () => {
  it("does not pre-clear current AI output in any staging entrypoint", () => {
    const sources = [
      readFromFunctions("../resetAiEnrichmentForProcessing.ts"),
      readFromFunctions("../enqueueAiEnrichment.ts"),
      readFromFunctions("reprocessReadyDesignWithAiCore.ts"),
      readFromFunctions("../catalogReprocess/catalogReprocessAiClear.ts"),
    ];

    for (const source of sources) {
      assert.doesNotMatch(source, /aiSuggestions:\s*FieldValue\.delete\(\)/);
      assert.doesNotMatch(source, /aiAnalysis:\s*FieldValue\.delete\(\)/);
      assert.doesNotMatch(source, /smartProfile:\s*FieldValue\.delete\(\)/);
      assert.doesNotMatch(source, /aiReviewConfidence:\s*FieldValue\.delete\(\)/);
      assert.match(source, /aiProcessingAttemptId/);
    }
  });

  it("records failure separately instead of replacing aiSuggestions", () => {
    const pipeline = readFromFunctions("aiEnrichmentPipeline.ts");
    assert.match(pipeline, /aiProcessingError: failure/);
    assert.match(pipeline, /aiProcessingAttemptId/);
    assert.doesNotMatch(pipeline, /aiSuggestions:\s*suggestions/);
  });

  it("guards stage and terminal writes by the current attempt", () => {
    const fields = readFromFunctions("designAiFields.ts");
    const pipeline = readFromFunctions("aiEnrichmentPipeline.ts");
    assert.match(fields, /data\?\.aiProcessingAttemptId !== attemptId/);
    assert.match(pipeline, /isCurrentAiProcessingAttempt\(data, attemptId\)/);
    assert.match(pipeline, /runTransaction/);
  });

  it("keeps the Ready Catalog lifecycle preservation contract", () => {
    const clear = readFromFunctions("../catalogReprocess/catalogReprocessAiClear.ts");
    assert.match(clear, /buildReadyCatalogReprocessAiStageUpdate/);
    assert.doesNotMatch(clear, /aiReviewNotes:\s*FieldValue\.delete\(\)/);
    assert.doesNotMatch(clear, /aiReviewedBy:\s*FieldValue\.delete\(\)/);
    assert.doesNotMatch(clear, /aiReviewedAt:\s*FieldValue\.delete\(\)/);
  });
});
