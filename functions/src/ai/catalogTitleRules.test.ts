import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CATALOG_ENRICHMENT_SYSTEM_PROMPT,
  OPENAI_CATALOG_ENRICHMENT_PROMPT_VERSION,
  buildCatalogEnrichmentSystemPrompt,
  descriptionLacksVisibleTextOverlap,
  extractPrimaryWordingFromDescription,
  isFilenameLikeTitle,
  isGenericCatalogTitle,
  normalizeAiTags,
  normalizeCatalogTitle,
  resolveCatalogTitle,
  sanitizeCatalogDescription,
  filterBackgroundColorsFromPalette,
  stripTrailingTitlePunctuation,
} from "./catalogTitleRules";

describe("catalogTitleRules", () => {
  it("uses prompt version v11", () => {
    assert.equal(OPENAI_CATALOG_ENRICHMENT_PROMPT_VERSION, "catalog-enrich-openai-v11");
  });

  it("includes v11 OCR, description, and category rules in system prompt", () => {
    assert.match(CATALOG_ENRICHMENT_SYSTEM_PROMPT, /death/);
    assert.match(CATALOG_ENRICHMENT_SYSTEM_PROMPT, /visibleText\[0\]/);
    assert.match(CATALOG_ENRICHMENT_SYSTEM_PROMPT, /joined with " \/ "/);
    assert.match(CATALOG_ENRICHMENT_SYSTEM_PROMPT, /Avoid unrelated generic categories/i);
    assert.match(CATALOG_ENRICHMENT_SYSTEM_PROMPT, /never end the title with punctuation/i);
    assert.match(buildCatalogEnrichmentSystemPrompt(["witch"]), /\bwitch\b/);
  });

  it("sanitizeCatalogDescription removes gray background phrases", () => {
    assert.equal(
      sanitizeCatalogDescription(
        "A dancing skeleton with purple stars on a gray background.",
      ),
      "A dancing skeleton with purple stars",
    );
    assert.equal(
      sanitizeCatalogDescription("Funny raccoon against a neutral background."),
      "Funny raccoon",
    );
  });

  it("filters excluded morbid tags after normalization", () => {
    assert.deepEqual(normalizeAiTags(["skeleton", "death", "dance", "skull"]), [
      "skeleton",
      "dance",
    ]);
    assert.deepEqual(normalizeAiTags(["witch", "dance"], undefined, 20, ["witch", "death"]), ["dance"]);
  });

  it("filterBackgroundColorsFromPalette removes canvas-related colors", () => {
    assert.deepEqual(
      filterBackgroundColorsFromPalette(["purple", "gray", "gray background", "yellow"]),
      ["purple", "yellow"],
    );
  });

  it("normalizes title case and trims version suffixes", () => {
    assert.equal(normalizeCatalogTitle("hot mess highland cow"), "Hot Mess Highland Cow");
    assert.equal(normalizeCatalogTitle("Connie VanEtta - V 2"), "Connie Vanetta");
  });

  it("strips trailing punctuation and separator tokens from titles", () => {
    assert.equal(normalizeCatalogTitle("Some Days It Rocks Me -"), "Some Days It Rocks Me");
    assert.equal(normalizeCatalogTitle("Foo Bar |"), "Foo Bar");
    assert.equal(stripTrailingTitlePunctuation("Faith Over Fear."), "Faith Over Fear");
  });

  it("prefers first visibleText segment when candidate is wrong segment with trailing dash", () => {
    assert.equal(
      resolveCatalogTitle({
        candidateTitle: "Some Days It Rocks Me -",
        uploadFileStem: "motherhood",
        visibleText: [
          "SOME DAYS I ROCK IT",
          "SOME DAYS IT ROCKS ME",
          "EITHER WAY WE'RE ROCKIN'",
          "MOTHERHOOD",
        ],
        artworkContainsText: true,
      }),
      "Some Days I Rock It",
    );
  });

  it("detects description sentence 1 missing primary visibleText overlap", () => {
    assert.equal(
      descriptionLacksVisibleTextOverlap("Motherhood.", [
        "SOME DAYS I ROCK IT",
        "MOTHERHOOD",
      ]),
      true,
    );
    assert.equal(
      descriptionLacksVisibleTextOverlap(
        'SOME DAYS I ROCK IT / SOME DAYS IT ROCKS ME / MOTHERHOOD. Skeleton mom design.',
        ["SOME DAYS I ROCK IT", "MOTHERHOOD"],
      ),
      false,
    );
  });

  it("detects filename-like titles", () => {
    assert.equal(isFilenameLikeTitle("Connie VanEtta - V 2", "Connie VanEtta - V 2"), true);
    assert.equal(isFilenameLikeTitle("Hot Mess Highland Cow", "Connie VanEtta - V 2"), false);
  });

  it("falls back to primary subject when candidate matches upload stem", () => {
    assert.equal(
      resolveCatalogTitle({
        candidateTitle: "Connie VanEtta - V 2",
        primarySubject: "Highland cow with messy hair",
        tags: ["highland cow", "funny"],
        uploadFileStem: "Connie VanEtta - V 2",
      }),
      "Highland Cow With Messy Hair",
    );
  });

  it("prefers visible artwork text even when the upload stem contains the same words", () => {
    assert.equal(
      resolveCatalogTitle({
        candidateTitle: "Dee's Nuts Farmer Logo",
        primarySubject: "Smiling boy holding a peanut",
        tags: ["peanut", "cartoon", "logo"],
        uploadFileStem: "Dees Nuts - V 1",
        visibleText: ["Dee's Nuts", "You haven't lived until you had Dee's Nuts in your mouth"],
      }),
      "Dee's Nuts Farmer Logo",
    );
  });

  it("builds visible-text titles with supporting artwork context", () => {
    assert.equal(
      resolveCatalogTitle({
        primarySubject: "farmer logo",
        tags: ["peanut", "country"],
        uploadFileStem: "Dees Nuts - V 1",
        visibleText: ["Dees Nuts"],
      }),
      "Dees Nuts Farmer Logo Peanut",
    );
  });

  it("adds black or white text suffixes for single-color text artwork", () => {
    assert.equal(
      resolveCatalogTitle({
        candidateTitle: "Faith Over Fear",
        tags: ["faith"],
        uploadFileStem: "upload",
        visibleText: ["Faith Over Fear"],
        visibleTextColor: "white",
      }),
      "Faith Over Fear White Text",
    );
  });

  it("normalizes reusable AI tag synonyms into single-word tags", () => {
    assert.deepEqual(
      normalizeAiTags(["Humorous", "sarcastic", "highland cow", "humor"]),
      ["funny", "sarcastic", "highland", "cow"],
    );
  });

  it("does not add visible text phrases as tags", () => {
    assert.deepEqual(normalizeAiTags(["peanut", "farmer", "funny"], ["Dee's Nuts"]), [
      "peanut",
      "farmer",
      "funny",
    ]);
  });

  it("splits phrase tags into single words and drops stopwords", () => {
    assert.deepEqual(
      normalizeAiTags(["trust me, i'm totally innocent", "raccoon hoodie"]),
      ["trust", "totally", "innocent", "raccoon", "hoodie"],
    );
  });

  it("keeps tags within the 40 character single-word limit", () => {
    const longWord = "a".repeat(45);

    assert.deepEqual(normalizeAiTags([longWord, "cow"]), ["cow"]);
  });

  it("rejects generic Text title when visibleText has the primary slogan", () => {
    assert.equal(
      resolveCatalogTitle({
        candidateTitle: "Text",
        description: "The design reads \"I'm not arguing, I'm just explaining why I'm right!\"",
        uploadFileStem: "upload",
        visibleText: ["I'M NOT ARGUING I'M JUST EXPLAINING WHY I'M RIGHT"],
        artworkContainsText: true,
      }),
      "I'm Not Arguing I'm Just Explaining",
    );
  });

  it("falls back to description wording when visibleText is empty and title is generic", () => {
    assert.equal(
      resolveCatalogTitle({
        candidateTitle: "Text",
        description: 'Features the phrase "Faith Over Fear" in bold lettering.',
        uploadFileStem: "upload",
        artworkContainsText: true,
      }),
      "Faith Over Fear",
    );
  });

  it("blocks generic candidate titles when artwork contains text", () => {
    assert.equal(
      isGenericCatalogTitle("Text"),
      true,
    );
    assert.equal(
      resolveCatalogTitle({
        candidateTitle: "Typography",
        primarySubject: "funny phrase",
        tags: ["humor"],
        uploadFileStem: "upload",
        visibleText: ["Dee's Nuts"],
        artworkContainsText: true,
      }),
      "Dee's Nuts Funny Phrase Humor",
    );
  });

  it("extracts quoted wording from descriptions", () => {
    assert.equal(
      extractPrimaryWordingFromDescription('The shirt says "Hot Mess Highland Cow" in rustic font.'),
      "Hot Mess Highland Cow",
    );
  });
});
