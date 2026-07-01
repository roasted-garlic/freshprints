import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { mapDesignAiFields } from "./designAiFieldsMapper";

describe("mapDesignAiFields", () => {
  it("maps token/cost fields from Firestore data onto aiSuggestions", () => {
    const result = mapDesignAiFields({
      aiSuggestions: {
        provider: "google",
        model: "gemini-2.5-flash-lite",
        promptVersion: "catalog-enrich-openai-v18",
        promptTokens: 1234,
        completionTokens: 56,
        estimatedCostUsd: 0.000178,
      },
    });

    assert.equal(result.aiSuggestions?.promptTokens, 1234);
    assert.equal(result.aiSuggestions?.completionTokens, 56);
    assert.equal(result.aiSuggestions?.estimatedCostUsd, 0.000178);
  });

  it("defaults token/cost fields to null when missing", () => {
    const result = mapDesignAiFields({
      aiSuggestions: {
        provider: "google",
        model: "gemini-2.5-flash-lite",
      },
    });

    assert.equal(result.aiSuggestions?.promptTokens, null);
    assert.equal(result.aiSuggestions?.completionTokens, null);
    assert.equal(result.aiSuggestions?.estimatedCostUsd, null);
  });

  it("ignores non-numeric token/cost values", () => {
    const result = mapDesignAiFields({
      aiSuggestions: {
        promptTokens: "not-a-number",
        completionTokens: null,
        estimatedCostUsd: undefined,
      },
    });

    assert.equal(result.aiSuggestions?.promptTokens, null);
    assert.equal(result.aiSuggestions?.completionTokens, null);
    assert.equal(result.aiSuggestions?.estimatedCostUsd, null);
  });

  it("returns undefined aiSuggestions when the field is absent", () => {
    const result = mapDesignAiFields({});
    assert.equal(result.aiSuggestions, undefined);
  });
});
