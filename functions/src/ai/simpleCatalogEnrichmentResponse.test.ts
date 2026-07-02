import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { AiEnrichmentInput } from "./providers/AiEnrichmentProvider";
import {
  buildSimpleCatalogEnrichmentResult,
  extractJsonObject,
  normalizeSimpleCatalogEnrichment,
} from "./simpleCatalogEnrichmentResponse";
import { CATALOG_ENRICHMENT_PROMPT_VERSION } from "./catalogTitleRules";
import { DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE } from "../../../shared/constants/aiEnrichment.constants";

const EXCLUSIONS = ["death", "skull"];

function enrichmentInput(overrides: Partial<AiEnrichmentInput> = {}): AiEnrichmentInput {
  return {
    designId: "design-1",
    uploadFileStem: "raw-upload-file",
    previewPath: "previews/design-1.webp",
    previewBytes: Buffer.from("fake"),
    previewContentType: "image/webp",
    promptTemplate: DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
    categoryOptions: [],
    categoryNames: [],
    approvedTags: [],
    approvedTagNames: [],
    categoryIdsByName: {},
    effectiveTagExclusions: EXCLUSIONS,
    ...overrides,
  };
}

describe("extractJsonObject", () => {
  it("parses plain JSON", () => {
    assert.deepEqual(extractJsonObject('{"title":"Hi"}'), { title: "Hi" });
  });

  it("parses JSON inside a fenced code block", () => {
    const raw = "```json\n{\"title\":\"Hi\"}\n```";
    assert.deepEqual(extractJsonObject(raw), { title: "Hi" });
  });

  it("parses JSON embedded in surrounding prose", () => {
    const raw = 'Here is the result: {"title":"Hi","tags":["a"]} hope that helps!';
    assert.deepEqual(extractJsonObject(raw), { title: "Hi", tags: ["a"] });
  });

  it("returns an empty object for unparseable content", () => {
    assert.deepEqual(extractJsonObject("not json at all"), {});
  });
});

describe("normalizeSimpleCatalogEnrichment", () => {
  it("trims required strings", () => {
    const parsed = normalizeSimpleCatalogEnrichment(
      {
        category: "  Motherhood  ",
        description: "  a design  ",
        title: "  Cool Title  ",
        tags: [],
      },
      EXCLUSIONS,
    );

    assert.equal(parsed.category, "Motherhood");
    assert.equal(parsed.description, "a design");
    assert.equal(parsed.title, "Cool Title");
  });

  it("enforces single-word tags, dedupes, and filters excluded + generic tags", () => {
    const parsed = normalizeSimpleCatalogEnrichment(
      {
        category: "Motherhood",
        description: "A design.",
        title: "Cool Title",
        tags: ["mama bear", "mama", "death", "skull", "design", "funny", "funny"],
      },
      EXCLUSIONS,
    );

    // "mama bear" → tokens "mama"/"bear"; "death"/"skull" excluded; "design" generic; deduped.
    for (const tag of parsed.tags) {
      assert.ok(!tag.includes(" "), `tag "${tag}" should be a single word`);
    }
    assert.equal(new Set(parsed.tags).size, parsed.tags.length, "tags should be deduped");
    assert.ok(!parsed.tags.includes("death"));
    assert.ok(!parsed.tags.includes("skull"));
    assert.ok(!parsed.tags.includes("design"));
    assert.ok(parsed.tags.includes("mama"));
    assert.ok(parsed.tags.includes("funny"));
  });

  it("preserves multi-word raw tags without tokenizing them", () => {
    const parsed = normalizeSimpleCatalogEnrichment(
      {
        category: "Motherhood",
        description: "A design.",
        title: "Cool Title",
        tags: ["rock and roll", "Mama Bear", "funny", "funny"],
      },
      EXCLUSIONS,
    );

    // rawTags keeps the model's original multi-word strings (lowercased, deduped) so the
    // resolver can match them against approved names and aliases.
    assert.deepEqual(parsed.rawTags, ["rock and roll", "mama bear", "funny"]);
  });

  it("caps tags at the configured limit (8)", () => {
    const many = Array.from({ length: 30 }, (_, i) => `tag${i}`);
    const parsed = normalizeSimpleCatalogEnrichment(
      {
        category: "General",
        description: "A design.",
        title: "Cool Title",
        tags: many,
      },
      EXCLUSIONS,
    );
    assert.ok(parsed.tags.length <= 8);
  });

  it("normalizes complete suggested-new-tag objects", () => {
    const parsed = normalizeSimpleCatalogEnrichment(
      {
        category: "Characters",
        description: "A moody character portrait design.",
        title: "Moody Portrait",
        tags: ["portrait"],
        suggestedNewTags: [
          {
            name: " Wednesday ",
            aliases: ["Wednesday Addams", "Addams", "wednesday"],
            preferredWhen: " Use when Wednesday Addams is the main character. ",
            reason: "No approved character tag matched.",
          },
        ],
      },
      EXCLUSIONS,
    );

    assert.deepEqual(parsed.suggestedNewTags, [
      {
        aliases: ["wednesday addams", "addams"],
        name: "wednesday",
        preferredWhen: "Use when Wednesday Addams is the main character.",
        reason: "No approved character tag matched.",
        source: "ai",
      },
    ]);
  });

  it("drops incomplete suggested-new-tags and caps the retained suggestions", () => {
    const suggestions = Array.from({ length: 8 }, (_, index) => ({
      name: `tag${index}`,
      aliases: [`tag ${index}`],
      preferredWhen: `Use when tag ${index} is a primary visible subject.`,
      reason: "Approved tags were not specific enough.",
    }));

    const parsed = normalizeSimpleCatalogEnrichment(
      {
        category: "General",
        description: "A design.",
        title: "Cool Title",
        tags: ["cool"],
        suggestedNewTags: [
          { name: "two words", aliases: [], preferredWhen: "Use when relevant." },
          { name: "valid", aliases: [], preferredWhen: "" },
          ...suggestions,
        ],
      },
      EXCLUSIONS,
    );

    assert.equal(parsed.suggestedNewTags.length, 5);
    assert.deepEqual(
      parsed.suggestedNewTags.map((tag) => tag.name),
      ["tag0", "tag1", "tag2", "tag3", "tag4"],
    );
  });

  it("rejects missing required fields", () => {
    assert.throws(
      () => normalizeSimpleCatalogEnrichment({ category: "General", title: "Cool Title", tags: [] }, EXCLUSIONS),
      /description/,
    );
  });
});

describe("buildSimpleCatalogEnrichmentResult", () => {
  it("maps the parsed response into aiSuggestions and aiAnalysis, trusting the model title", () => {
    const parsed = normalizeSimpleCatalogEnrichment(
      {
        category: "Motherhood",
        description: "A bold typography slogan design.",
        title: "Some Days I Rock It",
        tags: ["mama", "funny", "retro"],
      },
      EXCLUSIONS,
    );

    const result = buildSimpleCatalogEnrichmentResult({
      parsed,
      enrichmentInput: enrichmentInput({
        categoryNames: ["Motherhood"],
        categoryIdsByName: { motherhood: "cat-motherhood" },
      }),
      modelId: "gemini-2.5-flash-lite",
    });

    assert.equal(result.suggestions.provider, "google");
    assert.equal(result.suggestions.model, "gemini-2.5-flash-lite");
    assert.equal(result.suggestions.promptVersion, CATALOG_ENRICHMENT_PROMPT_VERSION);
    // Lean path trusts the model title verbatim (only non-destructive normalization).
    assert.equal(result.suggestions.title, "Some Days I Rock It");
    assert.ok(result.suggestions.description && result.suggestions.description.length > 0);
    // Category is no longer resolved here (v18): the raw candidate is carried as a transient
    // analysis.rawCategory scoring signal for the pipeline's resolveThemeCategory step.
    assert.equal(result.suggestions.categoryName, undefined);
    assert.equal(result.suggestions.categoryId, undefined);
    assert.equal(result.analysis.rawCategory, "Motherhood");
    assert.deepEqual(result.suggestions.tags, ["mama", "funny", "retro"]);
    assert.deepEqual(result.analysis.rawTags, ["mama", "funny", "retro"]);
    assert.ok(typeof result.suggestions.generatedAt === "string");
  });

  it("preserves a good model title even when the description leads with the transcribed quote", () => {
    // Regression: previously resolveCatalogTitle derived the title from the description's leading
    // quote, collapsing "Motherhood Skeleton Rock On" into an OCR fragment.
    const parsed = normalizeSimpleCatalogEnrichment(
      {
        category: "Family",
        description:
          "SOME DAYS I ROCK IT - SOME DAYS IT ROCKS ME - EITHER WAY WE'RE ROCKIN' / MOTHERHOOD. A skeleton throws a rock-on hand sign in bold typography.",
        title: "Motherhood Skeleton Rock On",
        tags: ["motherhood", "skeleton", "attitude"],
      },
      EXCLUSIONS,
    );

    const result = buildSimpleCatalogEnrichmentResult({
      parsed,
      enrichmentInput: enrichmentInput(),
      modelId: "gpt-5.4-nano-2026-03-17",
    });

    assert.equal(result.suggestions.title, "Motherhood Skeleton Rock On");
    assert.ok(!/some days it rocks me/i.test(result.suggestions.title ?? ""));
  });

  it("preserves the full transcribed visible text in the description", () => {
    const description =
      "SOME DAYS I ROCK IT - SOME DAYS IT ROCKS ME - EITHER WAY WE'RE ROCKIN' / MOTHERHOOD. A skeleton design.";
    const parsed = normalizeSimpleCatalogEnrichment(
      {
        category: "Family",
        description,
        title: "Motherhood Skeleton Rock On",
        tags: ["motherhood"],
      },
      EXCLUSIONS,
    );

    const result = buildSimpleCatalogEnrichmentResult({
      parsed,
      enrichmentInput: enrichmentInput(),
      modelId: "gpt-5.4-nano-2026-03-17",
    });

    assert.ok(result.suggestions.description?.includes("SOME DAYS I ROCK IT"));
    assert.ok(result.suggestions.description?.includes("EITHER WAY WE'RE ROCKIN'"));
    assert.ok(result.suggestions.description?.includes("MOTHERHOOD"));
  });

  it("carries the raw model category as a transient analysis signal without resolving it here", () => {
    // Category resolution (including the Family-vs-Pop-Culture priority rules) now happens in the
    // pipeline's resolveThemeCategory step (see catalogThemeCategoryResolver.test.ts), using the
    // matched approved tags as an additional signal. This function only passes the raw candidate
    // through on analysis.rawCategory.
    const parsed = normalizeSimpleCatalogEnrichment(
      {
        category: "Family",
        description:
          "SOME DAYS I ROCK IT / MOTHERHOOD. A skeleton throws a rock-on sign.",
        title: "Motherhood Skeleton Rock On",
        tags: ["motherhood", "skeleton"],
      },
      EXCLUSIONS,
    );

    const result = buildSimpleCatalogEnrichmentResult({
      parsed,
      enrichmentInput: enrichmentInput({
        categoryNames: ["Family", "Pop Culture & Characters"],
        categoryIdsByName: {
          family: "cat-family",
          "pop culture & characters": "cat-pop-culture",
        },
      }),
      modelId: "gpt-5.4-nano-2026-03-17",
    });

    assert.equal(result.suggestions.categoryName, undefined);
    assert.equal(result.suggestions.categoryId, undefined);
    assert.equal(result.analysis.rawCategory, "Family");
  });

  it("falls back to a non-empty title and description when the model omits them", () => {
    const parsed = normalizeSimpleCatalogEnrichment(
      {
        category: "Funny",
        description: "An illustrated raccoon design.",
        title: "Raccoon Cartoon",
        tags: ["raccoon", "cartoon"],
      },
      EXCLUSIONS,
    );

    const result = buildSimpleCatalogEnrichmentResult({
      parsed,
      enrichmentInput: enrichmentInput(),
      modelId: "gpt-5.4-nano-2026-03-17",
    });

    assert.ok(result.suggestions.title && result.suggestions.title.trim().length > 0);
    assert.ok(result.suggestions.description && result.suggestions.description.trim().length > 0);
  });

  it("never uses the upload filename as the title", () => {
    const parsed = normalizeSimpleCatalogEnrichment(
      {
        category: "Floral",
        description: "A floral artwork design.",
        title: "raw-upload-file",
        tags: ["floral"],
      },
      EXCLUSIONS,
    );

    const result = buildSimpleCatalogEnrichmentResult({
      parsed,
      enrichmentInput: enrichmentInput({ uploadFileStem: "raw-upload-file" }),
      modelId: "gpt-5.4-nano-2026-03-17",
    });

    assert.notEqual(result.suggestions.title?.toLowerCase(), "raw-upload-file");
  });
});
