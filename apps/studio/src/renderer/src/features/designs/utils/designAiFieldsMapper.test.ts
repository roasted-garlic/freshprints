import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { mapDesignAiFields } from "./designAiFieldsMapper";

describe("mapDesignAiFields", () => {
  it("maps token/cost fields from Firestore data onto aiSuggestions", () => {
    const result = mapDesignAiFields({
      aiSuggestions: {
        provider: "google",
        model: "gemini-2.5-flash-lite",
        promptVersion: "catalog-enrich-v19",
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

  it("maps tagRerank fields from Firestore data onto aiSuggestions", () => {
    const result = mapDesignAiFields({
      aiSuggestions: {
        tagRerankStatus: "succeeded",
        tagRerankPromptTokens: 200,
        tagRerankCompletionTokens: 40,
        tagRerankEstimatedCostUsd: 0.000032,
        tagRerankPromptVersion: "catalog-tag-rerank-v1",
        tagRerankUncoveredConcepts: ["lightning"],
      },
    });

    assert.equal(result.aiSuggestions?.tagRerankStatus, "succeeded");
    assert.equal(result.aiSuggestions?.tagRerankPromptTokens, 200);
    assert.equal(result.aiSuggestions?.tagRerankCompletionTokens, 40);
    assert.equal(result.aiSuggestions?.tagRerankEstimatedCostUsd, 0.000032);
    assert.equal(result.aiSuggestions?.tagRerankPromptVersion, "catalog-tag-rerank-v1");
    assert.deepEqual(result.aiSuggestions?.tagRerankUncoveredConcepts, ["lightning"]);
  });

  it("maps tagRerankStatus 'skipped' and 'failed' correctly, and rejects invalid values", () => {
    const skipped = mapDesignAiFields({ aiSuggestions: { tagRerankStatus: "skipped" } });
    assert.equal(skipped.aiSuggestions?.tagRerankStatus, "skipped");

    const failed = mapDesignAiFields({
      aiSuggestions: { tagRerankStatus: "failed", tagRerankFailureReason: "network_error" },
    });
    assert.equal(failed.aiSuggestions?.tagRerankStatus, "failed");
    assert.equal(failed.aiSuggestions?.tagRerankFailureReason, "network_error");

    const invalid = mapDesignAiFields({ aiSuggestions: { tagRerankStatus: "not-a-real-status" } });
    assert.equal(invalid.aiSuggestions?.tagRerankStatus, undefined);
  });

  it("defaults tagRerank token/cost fields to null when missing", () => {
    const result = mapDesignAiFields({
      aiSuggestions: { provider: "google" },
    });

    assert.equal(result.aiSuggestions?.tagRerankPromptTokens, null);
    assert.equal(result.aiSuggestions?.tagRerankCompletionTokens, null);
    assert.equal(result.aiSuggestions?.tagRerankEstimatedCostUsd, null);
    assert.equal(result.aiSuggestions?.tagRerankStatus, undefined);
    assert.equal(result.aiSuggestions?.tagRerankUncoveredConcepts, undefined);
  });
});
