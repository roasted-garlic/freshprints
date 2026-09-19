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
    const staffArtwork = read("functions/src/staffArtwork.ts");
    assert.match(staffArtwork, /catalogTitleSource:\s*suppliedTitle \? "staff" : "import_filename"/);
    const promotion = read("functions/src/staffArtworkPromotion.ts");
    assert.match(promotion, /resolveStaffArtworkTitleSource\(artwork\)/);
    assert.match(promotion, /importSourceFileName:/);
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
    assert.match(
      resolver,
      /\(titleSource === "staff" \|\| titleSource === "trusted_import" \|\| titleSource === "ai_generated"\)/,
    );
    assert.match(resolver, /staffArtworkPlaceholderRoot/);
  });

  it("allows the provenance field on the staff metadata fast path", () => {
    const rules = read("firestore.rules");
    assert.match(rules, /"catalogTitleSource"/);
    assert.match(rules, /function catalogMetadataOnlyUpdate\(\)/);
  });

  it("keeps legacy Staff Artwork title inference bounded", () => {
    const promotion = read("functions/src/staffArtworkPromotion.ts");
    assert.match(promotion, /isImportPlaceholderTitle\(artwork\.title, artwork\.sourceFileName/);
    assert.match(promotion, /legacyFallback: true/);
    assert.doesNotMatch(promotion, /createdBy.*updatedBy.*catalogTitleSource/);
  });

  it("persists Staff Artwork AI titles only through the bounded helper", () => {
    const pipeline = read("functions/src/ai/aiEnrichmentPipeline.ts");
    assert.match(pipeline, /resolveStaffArtworkAiGeneratedTitle\(/);
    assert.match(pipeline, /\.\.\.staffArtworkTitleFields/);
    assert.match(read("functions/src/ai/finalCatalogCopy.ts"), /sourceStaffArtworkId/);
    // Staff-origin helper must spread after finalCatalogFields so autonomy cannot restore a
    // mis-stamped Staff Library hex title over the accepted AI title.
    const branchStart = pipeline.indexOf('if (mode === "ready_backfill")');
    const branchEnd = pipeline.indexOf("return true;", branchStart);
    const branch = pipeline.slice(branchStart, branchEnd);
    const finalIdx = branch.indexOf("...finalCatalogFields");
    const staffIdx = branch.indexOf("...staffArtworkTitleFields");
    assert.ok(finalIdx >= 0 && staffIdx > finalIdx);
  });
});
