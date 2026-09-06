/**
 * TD-034 diagnostic: Playground request prompt vs Processing persisted Settings vs promptVersion stamp.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { CATALOG_ENRICHMENT_PROMPT_VERSION } from "./catalogTitleRules";
import { shouldRunTagRerank } from "./aiEnrichmentCandidateCore";

const repoRoot = resolve(import.meta.dirname, "../../..");

function read(rel: string): string {
  return readFileSync(resolve(repoRoot, rel), "utf8");
}

describe("Playground vs Processing prompt resolution (diagnostic parity)", () => {
  it("stamps promptVersion from the code constant, not prompt text", () => {
    assert.equal(CATALOG_ENRICHMENT_PROMPT_VERSION, "catalog-enrich-v37");
    const stamp = read("functions/src/ai/simpleCatalogEnrichmentResponse.ts");
    assert.match(stamp, /promptVersion:\s*CATALOG_ENRICHMENT_PROMPT_VERSION/);
    assert.doesNotMatch(stamp, /promptVersion:\s*hash|promptVersion:\s*promptTemplate/);
  });

  it("Playground expands the request-body prompt, not Firestore promptTemplate", () => {
    const playground = read("functions/src/ai/aiEnrichmentPlayground.ts");
    assert.match(playground, /promptTemplate:\s*validatedRequest\.prompt/);
  });

  it("Processing pipeline clears settings cache then loads persisted promptTemplate", () => {
    const pipeline = read("functions/src/ai/aiEnrichmentPipeline.ts");
    assert.match(pipeline, /clearAiEnrichmentSettingsCache\(\)/);
    const core = read("functions/src/ai/aiEnrichmentCandidateCore.ts");
    assert.match(core, /promptTemplate:\s*enrichmentSettings\.promptTemplate/);
  });

  it("tag rerank still triggers in auto mode when primary matched tags are empty", () => {
    assert.equal(
      shouldRunTagRerank("auto", {
        allMatchesAreWeak: false,
        approvedTagCandidates: [],
        tags: [],
        suggestedNewTags: [],
        unmatchedCandidateCount: 0,
      }),
      true,
    );
    assert.equal(
      shouldRunTagRerank("off", {
        allMatchesAreWeak: false,
        approvedTagCandidates: [],
        tags: [],
        suggestedNewTags: [],
        unmatchedCandidateCount: 0,
      }),
      false,
    );
  });
});
