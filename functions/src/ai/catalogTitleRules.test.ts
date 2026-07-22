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
  it("uses prompt version v26", () => {
    assert.equal(CATALOG_ENRICHMENT_PROMPT_VERSION, "catalog-enrich-v26");
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
      // Style/mood tag words (funny, humor) must not be appended as supporting title words.
      "Dee's Nuts Phrase",
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

  it("keeps a good model title even when the description leads with a longer slogan", () => {
    // Do not collapse mixed-content titles into an OCR fragment from the description.
    const title = resolveLeanCatalogTitle({
      candidateTitle: "Motherhood Skeleton Rock On",
      tags: ["motherhood"],
      uploadFileStem: "upload",
      description:
        "SOME DAYS I ROCK IT - SOME DAYS IT ROCKS ME - EITHER WAY WE'RE ROCKIN' / MOTHERHOOD. A skeleton throws a rock-on hand sign.",
    });

    assert.equal(title, "Motherhood Skeleton Rock On");
    assert.ok(!/some days/i.test(title));
  });

  it("replaces style/tag-word titles with readable text from the description", () => {
    assert.equal(
      resolveLeanCatalogTitle({
        candidateTitle: "Sarcastic Funny Attitude Statement Retro Distressed",
        tags: ["sarcastic", "funny", "attitude", "statement", "retro", "distressed"],
        uploadFileStem: "upload",
        description:
          '"Kinda Give A Damn Kinda Don\'t Care" in distressed lettering with decorative stars.',
      }),
      "Kinda Give A Damn Kinda Don't Care",
    );
  });

  it("replaces partial tag-invented titles using description wording", () => {
    assert.equal(
      resolveLeanCatalogTitle({
        candidateTitle: "Sarcastic Funny Attitude Dont Care Give",
        tags: ["sarcastic", "funny", "attitude"],
        uploadFileStem: "upload",
        description:
          "Kinda Give A Damn Kinda Don't Care. Distressed typography slogan on apparel.",
      }),
      "Kinda Give A Damn Kinda Don't Care",
    );
  });

  it("prefers description wording over tags when the model title is generic", () => {
    assert.equal(
      resolveLeanCatalogTitle({
        candidateTitle: "Text",
        tags: ["cowgirl", "western"],
        uploadFileStem: "upload",
        description: '"Western Cowgirl Sunset Ride" in bold script.',
      }),
      "Western Cowgirl Sunset Ride",
    );
  });

  it("rejects a filename-like title when description has no extractable readable wording", () => {
    const title = resolveLeanCatalogTitle({
      candidateTitle: "raw-upload-file",
      tags: ["floral"],
      uploadFileStem: "raw-upload-file",
      description: "Floral highland cow wearing a leopard bow.",
    });

    assert.notEqual(title.toLowerCase(), "raw-upload-file");
    // Visual-scene first sentences are not used as title wording (description-leakage harden).
    assert.equal(title, "Artwork Design");
  });

  it("never synthesizes a title by joining tags", () => {
    assert.equal(
      resolveLeanCatalogTitle({
        candidateTitle: "Design",
        tags: ["sarcastic", "funny", "attitude", "retro"],
        uploadFileStem: "upload",
      }),
      "Artwork Design",
    );
  });

  it("falls back to Artwork Design when title and description are unusable", () => {
    assert.equal(
      resolveLeanCatalogTitle({ candidateTitle: "Design", tags: [], uploadFileStem: "upload" }),
      "Artwork Design",
    );
  });

  it("does not reduce a straight-apostrophe title to I", () => {
    assert.equal(
      resolveLeanCatalogTitle({
        candidateTitle: "I",
        tags: ["funny"],
        uploadFileStem: "upload",
        description: '"I\'m Fine The Rest of You Need Therapy" in bold lettering.',
      }),
      "I'm Fine The Rest Of You Need Therapy",
    );
  });

  it("preserves a full straight-apostrophe model title", () => {
    assert.equal(
      resolveLeanCatalogTitle({
        candidateTitle: "I'm Fine The Rest of You Need Therapy",
        tags: ["funny"],
        uploadFileStem: "upload",
        description: '"I\'m Fine The Rest of You Need Therapy" in bold lettering.',
      }),
      "I'm Fine The Rest Of You Need Therapy",
    );
  });

  it("preserves a full curly-apostrophe model title", () => {
    const curly = "I\u2019m Fine The Rest of You Need Therapy";
    assert.equal(
      resolveLeanCatalogTitle({
        candidateTitle: curly,
        tags: ["funny"],
        uploadFileStem: "upload",
        description: `\u201C${curly}\u201D in bold lettering.`,
      }),
      "I\u2019m Fine The Rest Of You Need Therapy",
    );
  });

  it("completes repeated-contraction titles from the description", () => {
    assert.equal(
      resolveLeanCatalogTitle({
        candidateTitle: "I",
        tags: ["funny"],
        uploadFileStem: "upload",
        description:
          '"I\'m Not Arguing, I\'m Just Explaining Right" in bold stacked typography.',
      }),
      "I'm Not Arguing I'm Just Explaining Right",
    );
  });

  it("completes a dominant-first-line title from the full readable phrase", () => {
    assert.equal(
      resolveLeanCatalogTitle({
        candidateTitle: "Sarcasm",
        tags: ["funny"],
        uploadFileStem: "upload",
        description: '"Sarcasm Just One of My Many Talents" in bold text.',
      }),
      "Sarcasm Just One Of My Many Talents",
    );
  });

  it("joins separately quoted headline + continuation lines (Sarcasm multi-line narration)", () => {
    // Gemini often narrates each line as its own quote; first-quote-only extraction
    // previously left title "Sarcasm" looking complete.
    assert.equal(
      resolveLeanCatalogTitle({
        candidateTitle: "Sarcasm",
        tags: ["funny", "attitude"],
        uploadFileStem: "upload",
        description:
          'Large bold text reads "Sarcasm". Below it, in smaller distressed lettering, it says "Just one of my many talents." Decorative stars surround the wording.',
      }),
      "Sarcasm Just One Of My Many Talents",
    );
  });

  it("completes Sarcasm when only the headline is quoted and continuation is prose", () => {
    assert.equal(
      resolveLeanCatalogTitle({
        candidateTitle: "Sarcasm",
        tags: ["funny"],
        uploadFileStem: "upload",
        description:
          'Large bold text reads "Sarcasm". Below it, in smaller distressed lettering, it says Just one of my many talents. Decorative stars surround the wording.',
      }),
      "Sarcasm Just One Of My Many Talents",
    );
  });

  it("completes Sarcasm from slash-joined transcription without quotes", () => {
    assert.equal(
      resolveLeanCatalogTitle({
        candidateTitle: "Sarcasm",
        tags: ["funny"],
        uploadFileStem: "upload",
        description:
          "Sarcasm / Just one of my many talents in bold stacked typography with decorative stars.",
      }),
      "Sarcasm Just One Of My Many Talents",
    );
  });

  it("completes Sarcasm from a single full-phrase quote", () => {
    assert.equal(
      resolveLeanCatalogTitle({
        candidateTitle: "Sarcasm",
        tags: ["funny"],
        uploadFileStem: "upload",
        description: 'The design reads "Sarcasm Just one of my many talents" in two lines.',
      }),
      "Sarcasm Just One Of My Many Talents",
    );
  });

  it("completes Sarcasm from unquoted stacked-line narration", () => {
    assert.equal(
      resolveLeanCatalogTitle({
        candidateTitle: "Sarcasm",
        tags: ["funny"],
        uploadFileStem: "upload",
        description:
          "Sarcasm appears above a second line that reads Just one of my many talents with decorative sparkles.",
      }),
      "Sarcasm Just One Of My Many Talents",
    );
  });

  it("does not expand Sarcasm when the design truly has only that word", () => {
    assert.equal(
      resolveLeanCatalogTitle({
        candidateTitle: "Sarcasm",
        tags: ["funny"],
        uploadFileStem: "upload",
        description: '"Sarcasm" in bold black lettering on apparel.',
      }),
      "Sarcasm",
    );
  });

  it("does not treat style-word quotes as extra title segments", () => {
    assert.equal(
      resolveLeanCatalogTitle({
        candidateTitle: "Faith Over Fear",
        tags: ["faith"],
        uploadFileStem: "upload",
        description: 'The shirt says "Faith Over Fear" in a "bold" "distressed" style.',
      }),
      "Faith Over Fear",
    );
  });

  it("completes partial first-line titles when description has a second readable line", () => {
    assert.equal(
      resolveLeanCatalogTitle({
        candidateTitle: "Kinda Give A Damn",
        tags: ["funny"],
        uploadFileStem: "upload",
        description:
          '"Kinda Give A Damn" appears above a second line that reads "kinda don\'t care" with decorative stars.',
      }),
      "Kinda Give A Damn Kinda Don't Care",
    );
  });

  it("keeps text-dominant titles with decorative icons (no style-word invent)", () => {
    assert.equal(
      resolveLeanCatalogTitle({
        candidateTitle: "Kinda Give A Damn Kinda Don't Care",
        tags: ["funny", "stars"],
        uploadFileStem: "upload",
        description:
          '"Kinda Give A Damn Kinda Don\'t Care" in distressed lettering with decorative stars.',
      }),
      "Kinda Give A Damn Kinda Don't Care",
    );
  });

  it("keeps text plus a meaningful visual noun", () => {
    assert.equal(
      resolveLeanCatalogTitle({
        candidateTitle: "Just A Little Moody Cow",
        tags: ["cow", "funny"],
        uploadFileStem: "upload",
        description: '"Just A Little Moody" with a prominent cow illustration.',
      }),
      "Just A Little Moody Cow",
    );
  });

  it("keeps a useful no-text visual title", () => {
    assert.equal(
      resolveLeanCatalogTitle({
        candidateTitle: "Floral Highland Cow Wearing Leopard Bow",
        tags: ["cow", "floral"],
        uploadFileStem: "upload",
        description: "A floral highland cow wearing a leopard bow.",
      }),
      "Floral Highland Cow Wearing Leopard Bow",
    );
  });

  it("does not expand a genuinely complete one-word title", () => {
    assert.equal(
      resolveLeanCatalogTitle({
        candidateTitle: "Faith",
        tags: ["faith"],
        uploadFileStem: "upload",
        description: '"Faith" in bold gold lettering on apparel.',
      }),
      "Faith",
    );
  });

  it("extracts unquoted multi-contraction wording without apostrophe truncation", () => {
    assert.equal(
      extractPrimaryWordingFromDescription(
        "I'm not arguing, I'm just explaining right. Bold stacked text.",
        24,
      ),
      "I'm Not Arguing I'm Just Explaining Right",
    );
  });

  it("rebuilds description-leakage titles from readable text + central subject", () => {
    assert.equal(
      resolveLeanCatalogTitle({
        candidateTitle:
          "The Design Features The Outline Of Mouse Ears With A Red And White Polka Dot Bow",
        tags: ["christmas", "holiday"],
        uploadFileStem: "upload",
        readableTextLines: ["BEST CHRISTMAS EVER"],
        centralSubject: "Mouse Ears",
      }),
      "Best Christmas Ever Mouse Ears",
    );
  });

  it("does not use the first description sentence when Text reads identifies wording", () => {
    assert.equal(
      resolveLeanCatalogTitle({
        candidateTitle: "Artwork Design",
        tags: ["christmas"],
        uploadFileStem: "upload",
        description:
          'The design features the outline of mouse ears with a red and white polka dot bow. Text reads "BEST CHRISTMAS EVER" in red and pink lettering.',
        centralSubject: "Mouse Ears",
      }),
      "Best Christmas Ever Mouse Ears",
    );
  });

  it("extracts single-quoted Text reads wording without using the design-features sentence", () => {
    assert.equal(
      resolveLeanCatalogTitle({
        candidateTitle:
          "The Design Features The Outline Of Mouse Ears With A Red And White Polka Dot Bow",
        tags: ["christmas"],
        uploadFileStem: "upload",
        description:
          "The design features the outline of mouse ears with a red and white polka dot bow. Inside the ears, a black silhouette of a castle with flags is prominent. Text reads 'BEST CHRISTMAS EVER' in red and pink lettering.",
        centralSubject: "Mouse Ears",
      }),
      "Best Christmas Ever Mouse Ears",
    );
  });

  it("rejects common description-boilerplate title openings", () => {
    const openings = [
      "The design features pink bubble lettering",
      "The image shows green and red text",
      "The artwork depicts a holiday scene",
      "This graphic contains mouse ears",
      "An illustration of mouse ears with a bow",
    ];

    for (const opening of openings) {
      const title = resolveLeanCatalogTitle({
        candidateTitle: opening,
        tags: ["holiday"],
        uploadFileStem: "upload",
        readableTextLines: ["BEST CHRISTMAS EVER"],
        centralSubject: "Mouse Ears",
      });
      assert.equal(title, "Best Christmas Ever Mouse Ears");
      assert.ok(!/^the (design|image|artwork)\b/i.test(title));
      assert.ok(!/^this graphic\b/i.test(title));
      assert.ok(!/^an illustration\b/i.test(title));
    }
  });

  it("excludes decorative style details from the appended subject", () => {
    const title = resolveLeanCatalogTitle({
      candidateTitle: "Design",
      tags: ["christmas"],
      uploadFileStem: "upload",
      readableTextLines: ["BEST CHRISTMAS EVER"],
      centralSubject: "Red And White Polka Dot Bow",
    });

    assert.equal(title, "Best Christmas Ever");
    assert.ok(!/polka|bow|red and white/i.test(title));
  });

  it("preserves a correct model title that already includes readable wording + subject", () => {
    assert.equal(
      resolveLeanCatalogTitle({
        candidateTitle: "Best Christmas Ever Mouse Ears",
        tags: ["christmas"],
        uploadFileStem: "upload",
        readableTextLines: ["BEST CHRISTMAS EVER"],
        centralSubject: "Mouse Ears",
        description:
          'Text reads "BEST CHRISTMAS EVER" above mouse ears with a polka dot bow.',
      }),
      "Best Christmas Ever Mouse Ears",
    );
  });

  it("keeps a no-text mouse-ear visual title without forcing a text-based title", () => {
    assert.equal(
      resolveLeanCatalogTitle({
        candidateTitle: "Mouse Ears With Holiday Bow",
        tags: ["christmas"],
        uploadFileStem: "upload",
        readableTextLines: [],
        description: "Mouse ears with a red and white polka dot bow and Christmas accents.",
      }),
      "Mouse Ears With Holiday Bow",
    );
  });
});
