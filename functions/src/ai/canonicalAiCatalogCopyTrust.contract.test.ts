/**
 * ADR-FP-181 — canonical AI title/description trust (owner contract).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  acceptCanonicalCatalogCopy,
  isStructurallyValidCatalogCopy,
} from "./catalogTitleRules";
import {
  buildSimpleCatalogEnrichmentResult,
  normalizeSimpleCatalogEnrichment,
} from "./simpleCatalogEnrichmentResponse";
import type { AiEnrichmentInput } from "./providers/AiEnrichmentProvider";

const EXCLUSIONS: string[] = [];

function enrichmentInput(overrides: Partial<AiEnrichmentInput> = {}): AiEnrichmentInput {
  return {
    designId: "d1",
    previewPath: "previews/d1.webp",
    uploadFileStem: "upload",
    categoryNames: ["Funny & Sarcastic"],
    categoryIdsByName: { "funny & sarcastic": "funny" },
    approvedTags: [],
    ...overrides,
  };
}

describe("canonical AI catalog copy trust (ADR-FP-181)", () => {
  it("persists a strong visual AI title unchanged", () => {
    const parsed = normalizeSimpleCatalogEnrichment(
      {
        category: "Funny & Sarcastic",
        description: "A pin-up woman holds a cucumber with a sarcastic slogan.",
        title: "Retro Pin-Up Woman Holding Cucumber",
        tags: [],
        readableTextLines: ["WHEN LIFE GIVES YOU", "CUCUMBERS", "GO FUCK YOURSELF"],
        centralSubject: "woman",
      },
      EXCLUSIONS,
    );
    const result = buildSimpleCatalogEnrichmentResult({
      parsed,
      enrichmentInput: enrichmentInput(),
      modelId: "gemini-2.5-flash-lite",
    });
    assert.equal(result.suggestions.title, "Retro Pin-Up Woman Holding Cucumber");
  });

  it("persists a mediocre but structurally valid AI title unchanged", () => {
    const parsed = normalizeSimpleCatalogEnrichment(
      {
        category: "Funny & Sarcastic",
        description: "A humorous apparel design.",
        title: "Funny Design",
        tags: [],
      },
      EXCLUSIONS,
    );
    const result = buildSimpleCatalogEnrichmentResult({
      parsed,
      enrichmentInput: enrichmentInput(),
      modelId: "gemini-2.5-flash-lite",
    });
    assert.equal(result.suggestions.title, "Funny Design");
  });

  it("persists a slogan-heavy title unchanged (no readable-line rebuild)", () => {
    const parsed = normalizeSimpleCatalogEnrichment(
      {
        category: "Funny & Sarcastic",
        description: "A pin-up woman holds a cucumber.",
        title: "When Life Gives You Cucumbers Go Fuck Yourself",
        tags: [],
        readableTextLines: ["WHEN LIFE GIVES YOU", "CUCUMBERS"],
        centralSubject: "woman",
      },
      EXCLUSIONS,
    );
    const result = buildSimpleCatalogEnrichmentResult({
      parsed,
      enrichmentInput: enrichmentInput(),
      modelId: "gemini-2.5-flash-lite",
    });
    assert.equal(result.suggestions.title, "When Life Gives You Cucumbers Go Fuck Yourself");
    assert.doesNotMatch(result.suggestions.title ?? "", / Woman$/);
  });

  it("persists titles containing profanity unchanged", () => {
    const title = "Go Fuck Yourself Cucumber Pin-Up";
    const parsed = normalizeSimpleCatalogEnrichment(
      {
        category: "Funny & Sarcastic",
        description: "Edgy humor design.",
        title,
        tags: [],
      },
      EXCLUSIONS,
    );
    const result = buildSimpleCatalogEnrichmentResult({
      parsed,
      enrichmentInput: enrichmentInput(),
      modelId: "gemini-2.5-flash-lite",
    });
    assert.equal(result.suggestions.title, title);
  });

  it("persists titles with legitimate punctuation unchanged", () => {
    const title = "Rockin' & Rollin' — Mama's Day!";
    const parsed = normalizeSimpleCatalogEnrichment(
      {
        category: "Family",
        description: "A motherhood slogan design.",
        title,
        tags: [],
      },
      EXCLUSIONS,
    );
    const result = buildSimpleCatalogEnrichmentResult({
      parsed,
      enrichmentInput: enrichmentInput(),
      modelId: "gemini-2.5-flash-lite",
    });
    assert.equal(result.suggestions.title, title);
  });

  it("allows legitimate Unicode text", () => {
    const title = "Café Niño — Niño's Día";
    assert.equal(isStructurallyValidCatalogCopy(title), true);
    assert.equal(acceptCanonicalCatalogCopy("title", `  ${title}  `), title);
  });

  it("persists a rich AI description unchanged", () => {
    const description =
      "A vintage-style pin-up woman with styled blonde hair holds a cucumber. The overall concept is humorous and provocative.";
    const parsed = normalizeSimpleCatalogEnrichment(
      {
        category: "Funny & Sarcastic",
        description,
        title: "Retro Pin-Up Woman Holding Cucumber",
        tags: [],
      },
      EXCLUSIONS,
    );
    const result = buildSimpleCatalogEnrichmentResult({
      parsed,
      enrichmentInput: enrichmentInput(),
      modelId: "gemini-2.5-flash-lite",
    });
    assert.equal(result.suggestions.description, description);
  });

  it("persists a description quoting visible artwork text unchanged", () => {
    const description =
      'A pin-up woman holds a cucumber. Distressed text reads "WHEN LIFE GIVES YOU CUCUMBERS" and "GO FUCK YOURSELF...".';
    const parsed = normalizeSimpleCatalogEnrichment(
      {
        category: "Funny & Sarcastic",
        description,
        title: "Pin-up Woman Holding Cucumber",
        tags: [],
      },
      EXCLUSIONS,
    );
    const result = buildSimpleCatalogEnrichmentResult({
      parsed,
      enrichmentInput: enrichmentInput(),
      modelId: "gemini-2.5-flash-lite",
    });
    assert.equal(result.suggestions.description, description);
  });

  it("persists descriptions containing profanity unchanged", () => {
    const description = "The slogan says GO FUCK YOURSELF beneath the cucumber.";
    const parsed = normalizeSimpleCatalogEnrichment(
      {
        category: "Funny & Sarcastic",
        description,
        title: "Cucumber Slogan",
        tags: [],
      },
      EXCLUSIONS,
    );
    const result = buildSimpleCatalogEnrichmentResult({
      parsed,
      enrichmentInput: enrichmentInput(),
      modelId: "gemini-2.5-flash-lite",
    });
    assert.equal(result.suggestions.description, description);
  });

  it("rejects JSON / code-fence / corrupted-symbol garbage", () => {
    assert.equal(isStructurallyValidCatalogCopy('{"title":"x"}'), false);
    assert.equal(isStructurallyValidCatalogCopy("```json\n{\"a\":1}\n```"), false);
    assert.equal(isStructurallyValidCatalogCopy("____ ____ ____ ####"), false);
    assert.throws(() => acceptCanonicalCatalogCopy("title", '{"title":"x"}'));
  });

  it("rejects missing/empty required title or description", () => {
    assert.equal(isStructurallyValidCatalogCopy(""), false);
    assert.equal(isStructurallyValidCatalogCopy("   "), false);
    assert.equal(isStructurallyValidCatalogCopy("-"), false);
    assert.throws(() => acceptCanonicalCatalogCopy("title", "  "));
    assert.throws(() => acceptCanonicalCatalogCopy("description", "N/A"));
  });

  it("structural failure does not trigger semantic fallback generation", () => {
    assert.throws(() => {
      buildSimpleCatalogEnrichmentResult({
        parsed: {
          category: "Funny",
          description: "Valid description with enough letters.",
          title: "-",
          tags: [],
          rawTags: [],
          suggestedNewTags: [],
        },
        enrichmentInput: enrichmentInput(),
        modelId: "gemini-2.5-flash-lite",
      });
    }, /structurally invalid/);
  });
});
