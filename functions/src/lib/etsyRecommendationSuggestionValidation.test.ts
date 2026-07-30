import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HttpsError } from "firebase-functions/v2/https";

import {
  assertNoSuggestionCollision,
  validateAddEtsyRecommendationSuggestion,
  validateDeactivateSuggestionId,
} from "./etsyRecommendationSuggestionValidation";

describe("validateAddEtsyRecommendationSuggestion", () => {
  it("accepts a subject with optional token and aliases", () => {
    const result = validateAddEtsyRecommendationSuggestion({
      kind: "subject",
      label: "Space Llama",
      apiToken: "space llama",
      aliases: ["cosmic llama"],
    });
    assert.equal(result.kind, "subject");
    assert.equal(result.labelKey, "space llama");
    assert.deepEqual(result.aliases, ["cosmic llama"]);
  });

  it("accepts a style and forces apiToken to label", () => {
    const result = validateAddEtsyRecommendationSuggestion({
      kind: "style",
      label: "Whimsical",
      apiToken: "ignored",
    });
    assert.equal(result.apiToken, "Whimsical");
    assert.deepEqual(result.aliases, []);
  });

  it("rejects unknown kind and empty label", () => {
    assert.throws(
      () => validateAddEtsyRecommendationSuggestion({ kind: "other", label: "x" }),
      (error: unknown) => error instanceof HttpsError && error.code === "invalid-argument",
    );
    assert.throws(
      () => validateAddEtsyRecommendationSuggestion({ kind: "style", label: "   " }),
      (error: unknown) => error instanceof HttpsError && error.code === "invalid-argument",
    );
  });

  it("rejects ASCII control boundaries in labels and search tokens while accepting U+0080", () => {
    for (const control of ["\u0000", "\u001f", "\u007f"]) {
      assert.throws(
        () => validateAddEtsyRecommendationSuggestion({ kind: "style", label: `A${control}B` }),
        (error: unknown) => error instanceof HttpsError && error.code === "invalid-argument",
      );
      assert.throws(
        () =>
          validateAddEtsyRecommendationSuggestion({
            kind: "subject",
            label: "Valid",
            apiToken: `A${control}B`,
          }),
        (error: unknown) => error instanceof HttpsError && error.code === "invalid-argument",
      );
    }
    assert.equal(
      validateAddEtsyRecommendationSuggestion({ kind: "style", label: "A\u0080B" }).label,
      "A\u0080B",
    );
  });
});

describe("assertNoSuggestionCollision", () => {
  it("rejects static style Funny", () => {
    assert.throws(
      () => assertNoSuggestionCollision("style", new Set(["funny"]), new Set()),
      (error: unknown) => error instanceof HttpsError && error.code === "invalid-argument",
    );
  });

  it("rejects existing admin key", () => {
    assert.throws(
      () => assertNoSuggestionCollision("style", new Set(["quirky"]), new Set(["quirky"])),
      (error: unknown) => error instanceof HttpsError && error.code === "invalid-argument",
    );
  });
});

describe("validateDeactivateSuggestionId", () => {
  it("accepts suggestionId only", () => {
    assert.equal(validateDeactivateSuggestionId({ suggestionId: " abc " }), "abc");
  });

  it("rejects extra fields", () => {
    assert.throws(
      () => validateDeactivateSuggestionId({ suggestionId: "a", active: false }),
      (error: unknown) => error instanceof HttpsError && error.code === "invalid-argument",
    );
  });
});
