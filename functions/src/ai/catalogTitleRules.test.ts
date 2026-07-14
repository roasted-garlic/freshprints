import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CATALOG_ENRICHMENT_SYSTEM_PROMPT,
  CATALOG_ENRICHMENT_PROMPT_VERSION,
  buildCatalogEnrichmentSystemPrompt,
  buildCatalogEnrichmentUserPrompt,
  descriptionLacksVisibleTextOverlap,
  extractPrimaryWordingFromDescription,
  isFilenameLikeTitle,
  isGenericCatalogTitle,
  isPlaceholderCatalogDescription,
  normalizeAiTags,
  normalizeCatalogTitle,
  resolveCatalogDescription,
  resolveCatalogTitle,
  resolveLeanCatalogTitle,
  sanitizeCatalogDescription,
  filterBackgroundColorsFromPalette,
  stripTrailingTitlePunctuation,
} from "./catalogTitleRules";

describe("catalogTitleRules", () => {
  it("uses prompt version v21", () => {
    assert.equal(CATALOG_ENRICHMENT_PROMPT_VERSION, "catalog-enrich-v22");
  });

  it("keeps the JSON contract, OCR, canvas, and description rules in the trimmed prompt", () => {
    // Required JSON keys the downstream parser depends on must still be requested.
    for (const key of [
      "title",
      "description",
      "categoryName",
      "tags",
      "artworkContainsText",
      "visibleText",
      "textOnlyArtwork",
      "textRecognitionConfidence",
      "overallConfidence",
    ]) {
      assert.match(CATALOG_ENRICHMENT_SYSTEM_PROMPT, new RegExp(`\\b${key}\\b`));
    }

    assert.match(CATALOG_ENRICHMENT_SYSTEM_PROMPT, /Return JSON only/i);
    assert.match(CATALOG_ENRICHMENT_SYSTEM_PROMPT, /5 to 12 lowercase single-word strings/i);
    assert.match(CATALOG_ENRICHMENT_SYSTEM_PROMPT, /one entry per arc/i);
    assert.match(CATALOG_ENRICHMENT_SYSTEM_PROMPT, /Always return a non-empty description/i);
    assert.match(CATALOG_ENRICHMENT_SYSTEM_PROMPT, /Canvas rule:/i);
    assert.match(CATALOG_ENRICHMENT_SYSTEM_PROMPT, /lower confidence instead of inventing it/i);

    assert.match(buildCatalogEnrichmentUserPrompt("Animals"), /character by character/i);
    assert.match(buildCatalogEnrichmentUserPrompt("Animals"), /Analyze the provided image only/i);
    assert.match(buildCatalogEnrichmentUserPrompt("Animals"), /do not invent unreadable words/i);
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
    assert.equal(sanitizeCatalogDescription("on a gray background."), "");
  });

  it("detects placeholder catalog descriptions", () => {
    assert.equal(isPlaceholderCatalogDescription("-"), true);
    assert.equal(isPlaceholderCatalogDescription("—"), true);
    assert.equal(isPlaceholderCatalogDescription("N/A"), true);
    assert.equal(isPlaceholderCatalogDescription("A cartoon fox."), false);
  });

  it("fills description when sanitize removes background-only copy", () => {
    const result = resolveCatalogDescription({
      candidateDescription: "on a gray background.",
      primarySubject: "raccoon",
      style: "cartoon",
    });

    assert.equal(result.usedFallback, true);
    assert.equal(isPlaceholderCatalogDescription(result.description), false);
    assert.match(result.description, /raccoon/i);
  });

  it("synthesizes character-only illustration descriptions from subject and style", () => {
    const result = resolveCatalogDescription({
      candidateDescription: "-",
      primarySubject: "raccoon",
      style: "cartoon",
      artworkContainsText: false,
    });

    assert.equal(result.usedFallback, true);
    assert.equal(result.fallbackReason, "placeholder");
    assert.match(result.description, /raccoon/i);
    assert.match(result.description, /cartoon/i);
  });

  it("falls back to visible text when model returns placeholder description", () => {
    const result = resolveCatalogDescription({
      candidateDescription: "—",
      visibleText: ["RAVE ON", "PARTY TIME"],
      artworkContainsText: true,
      primarySubject: "raccoon",
      style: "cartoon",
    });

    assert.match(result.description, /RAVE ON/i);
    assert.match(result.description, /PARTY TIME/i);
  });

  it("keeps valid model descriptions without fallback", () => {
    const result = resolveCatalogDescription({
      candidateDescription: "A playful cartoon raccoon wearing a cowboy hat.",
      primarySubject: "raccoon",
      style: "cartoon",
    });

    assert.equal(result.usedFallback, false);
    assert.match(result.description, /cartoon raccoon/i);
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

  it("adds black or white text suffixes for text-only artwork", () => {
    assert.equal(
      resolveCatalogTitle({
        candidateTitle: "Faith Over Fear",
        tags: ["faith"],
        uploadFileStem: "upload",
        visibleText: ["Faith Over Fear"],
        visibleTextColor: "white",
        textOnlyArtwork: true,
      }),
      "Faith Over Fear White Text",
    );
  });

  it("does not add text color suffix for illustrated designs", () => {
    assert.equal(
      resolveCatalogTitle({
        candidateTitle: "Outside I'm Hootin Black Text",
        primarySubject: "raccoon",
        tags: ["raccoon", "cartoon", "western"],
        uploadFileStem: "raccoon-cowboy",
        visibleText: ["OUTSIDE I'M HOOTIN'", "INSIDE I'M HOLLERIN'"],
        visibleTextColor: "black",
        textOnlyArtwork: false,
        artworkContainsText: true,
      }),
      "Outside I'm Hootin",
    );
  });

  it("strips model-added suffix when textOnlyArtwork is not true", () => {
    assert.equal(
      resolveCatalogTitle({
        candidateTitle: "Faith Over Fear White Text",
        uploadFileStem: "upload",
        visibleText: ["Faith Over Fear"],
        visibleTextColor: "white",
        textOnlyArtwork: false,
      }),
      "Faith Over Fear",
    );
  });

  it("applies suffix when textOnlyArtwork is true and ink is black", () => {
    assert.equal(
      resolveCatalogTitle({
        candidateTitle: "Stay Humble",
        uploadFileStem: "upload",
        visibleText: ["STAY HUMBLE"],
        visibleTextColor: "black",
        textOnlyArtwork: true,
      }),
      "Stay Humble Black Text",
    );
  });

  it("filters generic production tags while keeping searchable tokens", () => {
    assert.deepEqual(
      normalizeAiTags(["shirt", "typography", "mama", "coffee", "funny", "nurse"]),
      ["mama", "coffee", "funny", "nurse"],
    );
  });

  it("tokenizes multi-word tags into single-word tags without rewriting the AI's word choice", () => {
    assert.deepEqual(
      normalizeAiTags(["Humorous", "sarcastic", "highland cow", "humor"]),
      ["humorous", "sarcastic", "highland", "cow", "humor"],
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

describe("resolveLeanCatalogTitle", () => {
  it("trusts a good model title verbatim (non-destructive normalization only)", () => {
    assert.equal(
      resolveLeanCatalogTitle({
        candidateTitle: "Motherhood Skeleton Rock On",
        tags: ["motherhood", "skeleton"],
        uploadFileStem: "upload-123",
      }),
      "Motherhood Skeleton Rock On",
    );
  });

  it("never derives an OCR fragment from the description (no description input at all)", () => {
    // The lean resolver takes no description; a transcribed-quote description can no longer
    // overwrite a good title.
    const title = resolveLeanCatalogTitle({
      candidateTitle: "Motherhood Skeleton Rock On",
      tags: ["motherhood"],
      uploadFileStem: "upload",
    });

    assert.ok(!/some days/i.test(title));
  });

  it("falls back to tags (not the description) when the model title is generic", () => {
    assert.equal(
      resolveLeanCatalogTitle({
        candidateTitle: "Text",
        tags: ["cowgirl", "western"],
        uploadFileStem: "upload",
      }),
      "Cowgirl Western",
    );
  });

  it("rejects a filename-like title and falls back to tags", () => {
    const title = resolveLeanCatalogTitle({
      candidateTitle: "raw-upload-file",
      tags: ["floral"],
      uploadFileStem: "raw-upload-file",
    });

    assert.notEqual(title.toLowerCase(), "raw-upload-file");
    assert.equal(title, "Floral");
  });

  it("falls back to Artwork Design when title and tags are unusable", () => {
    assert.equal(
      resolveLeanCatalogTitle({ candidateTitle: "Design", tags: [], uploadFileStem: "upload" }),
      "Artwork Design",
    );
  });
});
