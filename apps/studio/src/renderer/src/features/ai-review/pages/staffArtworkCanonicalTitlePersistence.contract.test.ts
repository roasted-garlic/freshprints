import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

const root = join(import.meta.dirname, "../../../../../../../../");

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("Staff Artwork canonical title persistence integration contract", () => {
  it("seeds and submits the accepted AI title through approval", () => {
    const formState = read(
      "apps/studio/src/renderer/src/features/ai-review/utils/aiReviewFormState.ts",
    );
    assert.match(formState, /title: hasAiSeed && suggestedTitle \? suggestedTitle : design\.title/);

    const inbox = read(
      "apps/studio/src/renderer/src/features/ai-review/services/aiReviewInboxService.ts",
    );
    assert.match(inbox, /title: draft\.title\.trim\(\)/);
    assert.match(inbox, /designService\.updateDesign\(caller, designId/);
    assert.match(inbox, /catalogApprovalService\.approveDesignForCatalog\(caller, designId, draftUpdated\)/);
  });

  it("persists canonical title authority and exposes that same field to Library and Portal", () => {
    const designService = read(
      "apps/studio/src/renderer/src/features/designs/services/designService.ts",
    );
    assert.match(designService, /updatePayload\.title = validateTitle\(input\.title\)/);
    assert.match(designService, /updatePayload\.catalogTitleSource = "staff"/);

    const designGrid = read("apps/studio/src/renderer/src/features/designs/components/DesignGrid.tsx");
    assert.match(designGrid, /design\.title/);

    const portalBuilder = read("functions/src/algolia/buildPortalCatalogAlgoliaRecord.ts");
    assert.match(portalBuilder, /title: data\.title\.trim\(\)/);
    assert.doesNotMatch(portalBuilder, /aiSuggestions\.title/);
  });

  it("keeps Staff Library origin as the scoped title-authority boundary", () => {
    const resolver = read("functions/src/ai/finalCatalogCopy.ts");
    assert.match(resolver, /sourceStaffArtworkId/);
    assert.match(resolver, /legacyMisstampedStaffArtworkRoot/);
    assert.match(resolver, /staffArtworkPlaceholderRoot/);
    assert.match(resolver, /isImportPlaceholderTitle/);

    const pipeline = read("functions/src/ai/aiEnrichmentPipeline.ts");
    const branchStart = pipeline.indexOf('if (mode === "ready_backfill")');
    const branchEnd = pipeline.indexOf("return true;", branchStart);
    const branch = pipeline.slice(branchStart, branchEnd);
    assert.ok(branch.indexOf("...staffArtworkTitleFields") > branch.indexOf("...finalCatalogFields"));
  });
});
