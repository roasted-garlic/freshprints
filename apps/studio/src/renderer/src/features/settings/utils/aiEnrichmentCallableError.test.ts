import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveAiEnrichmentCallableErrorMessage } from "./aiEnrichmentCallableError";

describe("AI enrichment callable error mapping", () => {
  it("reserves deployment copy for unavailable/not-found functions", () => {
    const unavailable = resolveAiEnrichmentCallableErrorMessage(
      { code: "functions/unavailable", message: "internal" },
      "playground",
    );
    const notFound = resolveAiEnrichmentCallableErrorMessage(
      { code: "functions/not-found", message: "not-found" },
      "semanticReview",
    );
    assert.match(unavailable, /Cloud Functions are deployed/i);
    assert.match(notFound, /Cloud Functions are deployed/i);
  });

  it("keeps provider/parser failures distinct from deployment failures", () => {
    const provider = resolveAiEnrichmentCallableErrorMessage(
      {
        code: "functions/failed-precondition",
        message: "The configured AI provider could not complete the Semantic Review.",
        details: { aiErrorCategory: "provider_upstream_failure" },
      },
      "semanticReview",
    );
    const parser = resolveAiEnrichmentCallableErrorMessage(
      {
        code: "functions/failed-precondition",
        message: "unsupported",
        details: { aiErrorCategory: "malformed_json" },
      },
      "semanticReview",
    );
    assert.match(provider, /provider could not complete/i);
    assert.match(parser, /unsupported Semantic Review response/i);
    assert.doesNotMatch(provider, /Cloud Functions are deployed/i);
    assert.doesNotMatch(parser, /Cloud Functions are deployed/i);
  });

  it("maps business preconditions, timeouts, and unknown internal errors safely", () => {
    assert.equal(
      resolveAiEnrichmentCallableErrorMessage(
        {
          code: "functions/failed-precondition",
          message: "Semantic Review cannot run because objective issues remain.",
          details: { aiErrorCategory: "business_precondition" },
        },
        "semanticReview",
      ),
      "Semantic Review cannot run for this result.",
    );
    assert.match(
      resolveAiEnrichmentCallableErrorMessage(
        {
          code: "functions/deadline-exceeded",
          message: "deadline-exceeded",
        },
        "playground",
      ),
      /timed out/i,
    );
    assert.match(
      resolveAiEnrichmentCallableErrorMessage(
        {
          code: "functions/internal",
          message: "internal",
          details: { aiErrorCategory: "unknown_internal" },
        },
        "semanticReview",
      ),
      /failed unexpectedly/i,
    );
  });

  it("gives canonical Semantic Review no-ops truthful copy", () => {
    assert.equal(
      resolveAiEnrichmentCallableErrorMessage(
        {
          code: "functions/failed-precondition",
          message: "unsupported",
          details: { aiErrorCategory: "semantic_review_noop" },
        },
        "semanticReview",
      ),
      "Semantic Review proposed no effective change. No changes were applied.",
    );
  });
});
