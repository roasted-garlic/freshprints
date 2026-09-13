import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SIMPLE_CATALOG_ENRICHMENT_SCHEMA } from "./simpleCatalogEnrichmentSchema";
import { normalizeSimpleCatalogEnrichment } from "./simpleCatalogEnrichmentResponse";
import { buildVisionRequestBody } from "./providers/geminiVisionEnrichmentProvider";
import { buildAiEnrichmentPlaygroundRequestBody } from "./aiEnrichmentPlayground";

describe("catalog response schema/parser parity", () => {
  it("covers every canonical response key emitted by the parser", () => {
    const parsed = normalizeSimpleCatalogEnrichment(
      {
        title: "Title",
        description: "Description",
        category: "Category",
        readableTextLines: [],
        centralSubject: "",
        subjects: [],
        objects: [],
        styles: [],
        themes: [],
        interests: [],
        professionsGroups: [],
        occasions: [],
        places: [],
        colors: [],
        visibleText: [],
        searchConcepts: [],
        categoryAlternatives: [],
        categoryGapNote: "",
        visualContextProfile: {
          version: "visual-context-v1",
          summary: "summary",
          detailedDescription: "description",
        },
      },
      [],
    );
    const canonicalKeys = new Set([
      "title", "description", "category", "centralSubject", "subjects", "objects", "styles",
      "themes", "interests", "professionsGroups", "occasions", "places", "colors", "visibleText",
      "searchConcepts", "categoryAlternatives", "categoryGapNote", "visualContextProfile",
    ]);
    for (const key of canonicalKeys) {
      assert.ok(key in SIMPLE_CATALOG_ENRICHMENT_SCHEMA.properties, key);
    }
    assert.equal("tags" in SIMPLE_CATALOG_ENRICHMENT_SCHEMA.properties, false);
    assert.equal("suggestedNewTags" in SIMPLE_CATALOG_ENRICHMENT_SCHEMA.properties, false);
    assert.equal("readableTextLines" in SIMPLE_CATALOG_ENRICHMENT_SCHEMA.properties, false);
    assert.equal("halftoneShadowLikelihood" in SIMPLE_CATALOG_ENRICHMENT_SCHEMA.properties, false);
    assert.equal("halftoneShadowEvidence" in SIMPLE_CATALOG_ENRICHMENT_SCHEMA.properties, false);
    assert.equal(parsed.visualContextProfile?.version, "visual-context-v1");
  });

  it("keeps Processing and Playground on the same response schema", () => {
    const processing = JSON.parse(buildVisionRequestBody("gemini-2.5-flash-lite", "prompt", "image", "image/webp", 2500, "system"));
    const playground = JSON.parse(buildAiEnrichmentPlaygroundRequestBody(
      { visionModelId: "gemini-2.5-flash-lite" } as never,
      undefined,
      undefined,
      "prompt",
      "system",
    ));
    assert.deepEqual(playground.response_format, processing.response_format);
    assert.equal(processing.max_completion_tokens, 2500);
    assert.equal(playground.max_completion_tokens, 2500);
  });
});
