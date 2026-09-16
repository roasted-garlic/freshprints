import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

const root = join(import.meta.dirname, "../../..");

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("canonical catalog title authority contract", () => {
  it("stamps import and staff boundaries", () => {
    assert.match(read("functions/src/promoteCustomerUploadToAiReview.ts"), /catalogTitleSource:\s*"import_filename"/);
    assert.match(read("functions/src/staffArtwork.ts"), /catalogTitleSource:\s*"staff"/);
    const designService = read("apps/studio/src/renderer/src/features/designs/services/designService.ts");
    assert.match(designService, /const catalogTitleSource\s*=|catalogTitleSource:\s*catalogTitleSource/);
    assert.match(designService, /updatePayload\.catalogTitleSource = "staff"/);
  });

  it("keeps title authority through queue and reprocess boundaries", () => {
    const pipeline = read("functions/src/ai/aiEnrichmentPipeline.ts");
    assert.match(pipeline, /catalogTitleSource: priorData\?\.catalogTitleSource/);
    assert.match(pipeline, /catalogTitleSource: reconciledFinalCatalogCopy\.catalogTitleSource/);
    const reprocess = read("functions/src/ai/reprocessReadyDesignWithAiCore.ts");
    assert.match(reprocess, /"catalogTitleSource"/);
  });

  it("does not infer authority from generic staff metadata or title text", () => {
    const resolver = read("functions/src/ai/finalCatalogCopy.ts");
    assert.doesNotMatch(resolver, /createdBy\s*&&\s*updatedBy\s*&&\s*createdBy\s*!==\s*updatedBy/);
    assert.doesNotMatch(resolver, /titleSource\s*===\s*"import_filename"[\s\S]{0,240}\?\s*"staff"/);
    assert.match(resolver, /titleSource === "staff" \|\| titleSource === "trusted_import" \|\| titleSource === "ai_generated"/);
  });

  it("allows the provenance field on the staff metadata fast path", () => {
    const rules = read("firestore.rules");
    assert.match(rules, /"catalogTitleSource"/);
    assert.match(rules, /function catalogMetadataOnlyUpdate\(\)/);
  });
});
