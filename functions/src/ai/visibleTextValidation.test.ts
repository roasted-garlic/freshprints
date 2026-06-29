import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  extractVisibleTextFromDescription,
  isImplausibleVisibleText,
  resolveVisibleTextPhrases,
  shouldRetryVisibleTextOcr,
} from "./visibleTextValidation";

describe("visibleTextValidation", () => {
  it("accepts valid dual-arc phrases", () => {
    assert.equal(isImplausibleVisibleText(["SLEEP DEPRIVED", "BARELY ALIVE"]), false);
  });

  it("flags combined dual-arc phrase in one entry", () => {
    assert.equal(isImplausibleVisibleText(["Slipped Deprived Barely Alive"]), true);
  });

  it("flags gibberish fragmentation", () => {
    assert.equal(isImplausibleVisibleText(["Sl Epr lv Ed Epped De"]), true);
  });

  it("flags merged words without spaces", () => {
    assert.equal(isImplausibleVisibleText(["SLEEPERDEPRIVED"]), true);
  });

  it("requests OCR retry for low confidence or implausible text", () => {
    assert.equal(
      shouldRetryVisibleTextOcr({
        artworkContainsText: true,
        phrases: ["SLEEP DEPRIVED", "BARELY ALIVE"],
        textRecognitionConfidence: 0.9,
      }),
      false,
    );

    assert.equal(
      shouldRetryVisibleTextOcr({
        artworkContainsText: true,
        phrases: ["Slipped Deprived Barely Alive"],
        textRecognitionConfidence: 0.9,
      }),
      true,
    );

    assert.equal(
      shouldRetryVisibleTextOcr({
        artworkContainsText: true,
        phrases: ["SLEEP DEPRIVED", "BARELY ALIVE"],
        textRecognitionConfidence: 0.5,
      }),
      true,
    );
  });

  it("falls back to description sentence 1 phrases joined with slash", () => {
    const resolved = resolveVisibleTextPhrases({
      artworkContainsText: true,
      candidatePhrases: ["Slipped Deprived Barely Alive"],
      description: "SLEEP DEPRIVED / BARELY ALIVE. Skeleton with coffee mug.",
    });

    assert.equal(resolved.usedDescriptionFallback, true);
    assert.deepEqual(resolved.phrases, ["SLEEP DEPRIVED", "BARELY ALIVE"]);
    assert.equal(resolved.stillImplausible, false);
  });

  it("extracts slash-separated phrases from description", () => {
    assert.deepEqual(
      extractVisibleTextFromDescription("RAVE ON / PARTY TIME. Cartoon raccoon."),
      ["RAVE ON", "PARTY TIME"],
    );
  });
});
