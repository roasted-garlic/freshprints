import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

/**
 * Studio 1.0.4 P4 / WS3: successful derivative completion must automatically trigger
 * background AI enqueue without requiring Start AI.
 */
describe("automatic AI after derivative pipeline success (regression)", () => {
  it("batch upload invokes onDesignPipelineSuccess only when pipelineSuccess is true", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/imports/services/importBatchOrchestrationService.ts",
    );
    assert.match(
      source,
      /if \(result\.pipelineSuccess === true && designId\) \{\s*onDesignPipelineSuccess\?\.\(designId\);/s,
    );
  });

  it("useBatchImport wires pipeline success to enqueueImportedDesignsForBackgroundAi", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/imports/hooks/useBatchImport.ts",
    );
    assert.match(source, /onDesignPipelineSuccess:\s*\(designId\)\s*=>\s*\{/);
    assert.match(source, /enqueueImportedDesignsForBackgroundAi\(\[designId\]\)/);
  });

  it("background queue calls enqueueForProcessing (enqueueAiEnrichment path)", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/imports/services/importAiBackgroundQueue.ts",
    );
    assert.match(source, /await aiEnrichmentEnqueueService\.enqueueForProcessing\(designId\)/);
  });

  it("single-file ImportsPage only enqueues when pipelineSuccess is true", () => {
    const source = read("apps/studio/src/renderer/src/features/imports/pages/ImportsPage.tsx");
    assert.match(source, /if \(!uploadResult\?\.pipelineSuccess \|\| !uploadResult\.designId\)/);
  });
});
