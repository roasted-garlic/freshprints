import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("active AI tag retirement contract", () => {
  it("keeps the active Pass 1 request and Processing path tag-inert", () => {
    const prompt = read("simpleCatalogEnrichmentPrompt.ts");
    const playground = read("aiEnrichmentPlayground.ts");
    const candidate = read("aiEnrichmentCandidateCore.ts");
    const pipeline = read("aiEnrichmentPipeline.ts");

    assert.doesNotMatch(prompt, /\{\{(?:approved_tags|excluded_tags)\}\}/);
    assert.doesNotMatch(playground, /resolveAiCatalogTags|catalogTagResolver|runTagRerank|runSuggestionAuthor/);
    assert.doesNotMatch(candidate, /resolveAiCatalogTags|catalogTagResolver|runTagRerank|runSuggestionAuthor/);
    assert.doesNotMatch(pipeline, /resolveAiCatalogTags|catalogTagResolver|runTagRerank|runSuggestionAuthor/);
  });

  it("keeps historical tag execution modules quarantined from active source", () => {
    const resolver = read("catalogTagResolver.ts");
    const categoryResolver = read("catalogThemeCategoryResolver.ts");
    const titleRules = read("catalogTitleRules.ts");

    assert.match(resolver, /@deprecated Compatibility-only tag resolver/);
    assert.match(categoryResolver, /@deprecated Compatibility-only historical category resolver/);
    assert.doesNotMatch(categoryResolver, /from ["']\.\/catalogTagResolver/);
    assert.match(categoryResolver, /normalizeCatalogPhrase/);
    assert.doesNotMatch(titleRules, /normalizeAiTags|tokenizeTagCandidate|buildTitleFromTags/);
  });

  it("removes retired AI fields at the persistence boundary while preserving staff tags", () => {
    const pipeline = read("aiEnrichmentPipeline.ts");
    assert.match(pipeline, /delete activeSuggestions\.tags/);
    assert.match(pipeline, /delete activeSuggestions\.suggestedNewTags/);
    assert.match(pipeline, /stripTransientAiAnalysisFields/);
    assert.doesNotMatch(pipeline, /design\.tags\s*=|tags:\s*firestoreSuggestions/);
  });
});
