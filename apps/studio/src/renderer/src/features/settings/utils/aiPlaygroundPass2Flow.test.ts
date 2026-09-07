import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { AiEnrichmentPlaygroundPass1Context } from "@fresh-prints/shared/types/ai/aiEnrichmentPlayground.types";
import {
  canAttemptPass2,
  createInitialPass2State,
  formatCombinedAiCost,
  getPlaygroundRunId,
  mapPass1ContextToSemanticReviewRequest,
  markPass2Attempted,
  resetPass2State,
} from "./aiPlaygroundPass2Flow";

const context = {
  normalized: {
    title: "Cat Graphic",
    description: "A cat graphic.",
    category: "Animals",
    subjects: ["cat"],
    objects: [],
    styles: [],
    themes: [],
    interests: [],
    professionsGroups: [],
    occasions: [],
    places: [],
    colors: [],
    visibleText: [],
    searchConcepts: [],
    categoryAlternatives: [],
    visualContextProfile: {
      version: "visual-context-v1" as const,
      summary: "A cat graphic.",
      detailedDescription: "A cat appears in a printable graphic.",
    },
  },
  originalSmartProfile: {
    categoryId: "animals",
    categoryName: "Animals",
    subjects: ["cat"],
    provenance: { version: "smart-profile-v1" },
  },
  categoryId: "animals",
  categoryName: "Animals",
  blockers: ["structured_evidence_gap:subjects:cat"],
  objectiveBlockers: [],
  semanticBlockers: ["structured_evidence_gap:subjects:cat"],
  pass2Eligibility: "eligible" as const,
  automationDecision:
    {} as AiEnrichmentPlaygroundPass1Context["automationDecision"],
  semanticReviewerEnabled: false,
} satisfies AiEnrichmentPlaygroundPass1Context;

describe("AI Playground Pass 2 flow", () => {
  it("maps the exact typed Pass 1 context to a text-only request", () => {
    const request = mapPass1ContextToSemanticReviewRequest({
      context,
      semanticReviewerModelId: "gemini-2.5-flash-lite",
    });

    assert.equal(request.title, "Cat Graphic");
    assert.equal(request.semanticReviewerModelId, "gemini-2.5-flash-lite");
    assert.equal("imageBase64" in request, false);
    assert.equal(JSON.stringify(request).includes("image"), false);
    assert.notEqual(
      request.originalSmartProfile,
      request.effectiveSmartProfile,
    );
    assert.deepEqual(
      request.originalSmartProfile,
      request.effectiveSmartProfile,
    );
  });

  it("consumes the one attempt before invocation and resets for a new run", () => {
    const initial = createInitialPass2State("trace-1");
    assert.equal(canAttemptPass2(context, initial), true);
    const attempted = markPass2Attempted(initial);
    assert.equal(attempted.attempted, true);
    assert.equal(canAttemptPass2(context, attempted), false);
    assert.deepEqual(
      resetPass2State("trace-2"),
      createInitialPass2State("trace-2"),
    );
    assert.equal(getPlaygroundRunId(null), null);
    assert.equal(
      getPlaygroundRunId({
        elapsedMs: 1,
        outputText: "{}",
        provider: "google",
        visionModelId: "gemini-2.5-flash-lite",
        version: "v39",
        promptTokens: 1,
        completionTokens: 1,
        estimatedCostUsd: 0.1,
        traceId: "trace-3",
        pass1Context: context,
      }),
      "trace-3",
    );
  });

  it("calculates combined cost only when both values are available", () => {
    assert.equal(formatCombinedAiCost(0.1, 0.2), "$0.300000");
    assert.equal(formatCombinedAiCost(null, 0.2), "N/A");
    assert.equal(formatCombinedAiCost(0.1, undefined), "N/A");
  });
});
