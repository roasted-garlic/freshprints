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

  it("maps separate processing failure metadata without replacing prior suggestions", () => {
    const result = mapDesignAiFields({
      aiSuggestions: { title: "Prior title" },
      aiProcessingAttemptId: "attempt-1",
      aiProcessingError: {
        attemptId: "attempt-1",
        errorCode: "provider_timeout",
        errorMessage: "Provider timeout",
        provider: "development",
        occurredAt: "2026-09-08T00:00:00.000Z",
      },
    });

    assert.equal(result.aiSuggestions?.title, "Prior title");
    assert.equal(result.aiProcessingAttemptId, "attempt-1");
    assert.equal(result.aiProcessingError?.errorCode, "provider_timeout");
  });
});
