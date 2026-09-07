import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { AiEnrichmentInput } from "./providers/AiEnrichmentProvider";
import {
  buildSimpleCatalogEnrichmentResult,
  extractJsonObject,
  normalizeSimpleCatalogEnrichment,
  toCanonicalSimpleCatalogEnrichmentJson,
} from "./simpleCatalogEnrichmentResponse";
import { CATALOG_ENRICHMENT_PROMPT_VERSION } from "./catalogTitleRules";
import { DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE } from "../../../packages/shared/src/constants/aiEnrichment.constants";

function enrichmentInput(): AiEnrichmentInput {
  return {
    designId: "design-1",
    uploadFileStem: "raw-upload-file",
    previewPath: "previews/design-1.webp",
    previewBytes: Buffer.from("fake"),
    previewContentType: "image/webp",
    promptTemplate: DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
    categoryOptions: [],
    categoryNames: [],
    categoryIdsByName: {},
  };
}

describe("extractJsonObject", () => {
  it("parses plain, fenced, and embedded JSON", () => {
    assert.deepEqual(extractJsonObject('{"title":"Hi"}'), { title: "Hi" });
    assert.deepEqual(extractJsonObject('```json\n{"title":"Hi"}\n```'), {
      title: "Hi",
    });
    assert.deepEqual(extractJsonObject('Result: {"title":"Hi"}'), {
      title: "Hi",
    });
  });
});

describe("normalizeSimpleCatalogEnrichment", () => {
  it("normalizes required fields and safely defaults omitted optional fields", () => {
    const parsed = normalizeSimpleCatalogEnrichment({
      category: "  Motherhood  ",
      description: "  a design  ",
      title: "  Cool Title  ",
      visualContextProfile: {
        version: "visual-context-v1",
        summary: "summary",
        detailedDescription: "description",
      },
    });

    assert.equal(parsed.category, "Motherhood");
    assert.equal(parsed.description, "a design");
    assert.equal(parsed.title, "Cool Title");
    assert.deepEqual(parsed.visibleText, undefined);
    assert.equal(parsed.professionsGroups, undefined);
    assert.equal(parsed.occasions, undefined);
    assert.equal(parsed.places, undefined);
    assert.equal(parsed.categoryGapNote, undefined);
  });

  it("uses visibleText as canonical and only reads historical readableTextLines as a fallback", () => {
    const canonical = normalizeSimpleCatalogEnrichment({
      category: "General",
      description: "A design.",
      title: "Visible Words",
      visibleText: ["Damn good art"],
      readableTextLines: ["stale legacy text"],
    });
    assert.deepEqual(canonical.visibleText, ["Damn good art"]);

    const legacy = normalizeSimpleCatalogEnrichment({
      category: "General",
      description: "A design.",
      title: "Legacy Words",
      readableTextLines: ["damn good art"],
    });
    assert.deepEqual(legacy.visibleText, ["damn good art"]);
  });

  it("enforces deterministic caps after provider maxItems removal", () => {
    const parsed = normalizeSimpleCatalogEnrichment({
      category: "General",
      description: "A design.",
      title: "Capped Design",
      visibleText: Array.from({ length: 30 }, (_, i) => `text-${i}`),
      subjects: Array.from({ length: 30 }, (_, i) => `subject-${i}`),
      visualContextProfile: {
        version: "visual-context-v1",
        summary: "summary",
        detailedDescription: "description",
        uncertainties: Array.from({ length: 30 }, (_, i) => `uncertainty-${i}`),
      },
    });
    assert.equal(parsed.visibleText?.length, 12);
    assert.equal(parsed.subjects?.length, 24);
    assert.equal(parsed.visualContextProfile?.uncertainties?.length, 12);
  });

  it("does not require or parse active tag, suggested-tag, or AI-halftone fields", () => {
    const parsed = normalizeSimpleCatalogEnrichment({
      category: "General",
      description: "A design.",
      title: "Tag Inert",
      tags: ["legacy"],
      suggestedNewTags: [{ name: "legacy", preferredWhen: "never" }],
      halftoneShadowLikelihood: "likely",
      halftoneShadowEvidence: "legacy",
    });
    assert.equal("tags" in parsed, false);
    assert.equal("suggestedNewTags" in parsed, false);
    assert.equal("halftoneShadowLikelihood" in parsed, false);
  });

  it("rejects missing required catalog fields", () => {
    assert.throws(
      () =>
        normalizeSimpleCatalogEnrichment({
          category: "General",
          title: "Missing description",
        }),
      /description/,
    );
  });
});

describe("canonical projection and result mapping", () => {
  it("projects only the v39 fields and preserves VCP/visibleText", () => {
    const parsed = normalizeSimpleCatalogEnrichment({
      category: "Motherhood",
      description: "A bold typography slogan design.",
      title: "Some Days I Rock It",
      visibleText: ["Some Days I Rock It"],
      subjects: ["woman"],
      visualContextProfile: {
        version: "visual-context-v1",
        summary: "A grounded design.",
        detailedDescription: "A grounded visual description.",
      },
    });
    const canonical = toCanonicalSimpleCatalogEnrichmentJson(parsed);
    assert.equal(canonical.visibleText instanceof Array, true);
    assert.equal("tags" in canonical, false);
    assert.equal("readableTextLines" in canonical, false);
    assert.equal("halftoneShadowLikelihood" in canonical, false);

    const result = buildSimpleCatalogEnrichmentResult({
      parsed,
      enrichmentInput: enrichmentInput(),
      modelId: "gemini-2.5-flash-lite",
    });
    assert.equal(
      result.suggestions.promptVersion,
      CATALOG_ENRICHMENT_PROMPT_VERSION,
    );
    assert.equal(result.suggestions.title, "Some Days I Rock It");
    assert.deepEqual(result.analysis.visibleText, ["Some Days I Rock It"]);
    assert.equal("rawTags" in result.analysis, false);
    assert.equal("halftoneShadowAssessment" in result.analysis, false);
  });
});
