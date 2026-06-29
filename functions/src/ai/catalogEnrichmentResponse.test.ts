import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyCatalogEnrichmentConsistencyRules,
  hasArtworkContainsTextConflict,
  normalizeVisibleTextColorFromRaw,
  parseCatalogEnrichmentResponse,
} from "./catalogEnrichmentResponse";

describe("catalogEnrichmentResponse", () => {
  it("coerces string tags and visibleText to arrays", () => {
    const parsed = parseCatalogEnrichmentResponse({
      title: "Mama Needs Coffee",
      description: "MAMA NEEDS COFFEE.",
      tags: "mama, coffee, funny, nurse, teacher",
      visibleText: "MAMA NEEDS COFFEE",
      artworkContainsText: "true",
      textOnlyArtwork: "false",
      textRecognitionConfidence: "0.92",
      overallConfidence: 1.2,
    });

    assert.deepEqual(parsed.visibleText, ["MAMA NEEDS COFFEE"]);
    assert.equal(parsed.artworkContainsText, true);
    assert.equal(parsed.textOnlyArtwork, false);
    assert.equal(parsed.textRecognitionConfidence, 0.92);
    assert.equal(parsed.overallConfidence, 1);
  });

  it("forces artworkContainsText from visibleText length", () => {
    const withText = applyCatalogEnrichmentConsistencyRules({
      description: "Hello.",
      tags: [],
      artworkContainsText: false,
      visibleText: ["HELLO"],
    });

    assert.equal(withText.artworkContainsText, true);

    const withoutText = applyCatalogEnrichmentConsistencyRules({
      description: "A raccoon.",
      tags: [],
      artworkContainsText: true,
      visibleText: undefined,
    });

    assert.equal(withoutText.artworkContainsText, false);
  });

  it("forces textOnlyArtwork false when primarySubject is raccoon", () => {
    const parsed = applyCatalogEnrichmentConsistencyRules({
      description: "Text with art.",
      tags: ["raccoon"],
      artworkContainsText: true,
      visibleText: ["FUNNY"],
      textOnlyArtwork: true,
      primarySubject: "raccoon",
    });

    assert.equal(parsed.textOnlyArtwork, false);
  });

  it("collapses visibleTextColor array to mixed enum", () => {
    assert.equal(normalizeVisibleTextColorFromRaw(["black", "white"]), "mixed");
    assert.equal(normalizeVisibleTextColorFromRaw(["black"]), "black");
    assert.equal(normalizeVisibleTextColorFromRaw("white"), "white");
  });

  it("detects artworkContainsText conflicts", () => {
    assert.equal(hasArtworkContainsTextConflict(false, ["HELLO"]), true);
    assert.equal(hasArtworkContainsTextConflict(true, []), true);
    assert.equal(hasArtworkContainsTextConflict(true, ["HELLO"]), false);
  });
});
