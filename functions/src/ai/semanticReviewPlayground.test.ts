import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { DesignSmartProfile } from "../../../packages/shared/src/types/catalog/smartProfile.types";
import type { AiEnrichmentTrace } from "../../../packages/shared/src/types/ai/aiEnrichmentTrace.types";
import { projectAiEnrichmentTrace } from "../../../packages/shared/src/utils/aiEnrichmentTrace";
import {
  buildSemanticReviewPlaygroundPass2Diagnostics,
  projectSemanticReviewPlaygroundResult,
} from "./semanticReviewPlayground";
import { buildSemanticReviewResponseFormat } from "./semanticReviewSchema";

const originalProfile: DesignSmartProfile = {
  categoryId: "animals",
  categoryName: "Animals",
  subjects: ["cat"],
  objects: ["whiskers"],
  provenance: {
    version: "smart-profile-v1",
    staffEditedDimensionKeys: [],
  },
};

const visualContextProfile = {
  version: "visual-context-v1" as const,
  summary: "A cat graphic.",
  detailedDescription: "A cat appears in a printable graphic.",
};

describe("projectSemanticReviewPlaygroundResult", () => {
  it("keeps the original profile immutable and returns the effective profile and WAA preview", () => {
    const result = projectSemanticReviewPlaygroundResult({
      originalSmartProfile: originalProfile,
      title: "Cat Graphic",
      description: "A cat with whiskers and kitten graphic for catalog search.",
      categoryId: "animals",
      categoryName: "Animals",
      visualContextProfile,
      initialEligibleBlockers: [],
      reviewResult: {
        decision: "APPROVE_WITH_PATCH",
        reason: "The subject is supported by the visual context.",
        blockersResolved: ["structured_evidence_gap:subjects:woman"],
        blockersUnresolved: [],
        patches: [{ field: "subjects", from: ["cat"], to: ["cat", "kitten"] }],
      },
      catalogWorkflowMode: "shadow",
      catalogAutonomousLiveEnabled: false,
    });

    assert.deepEqual(originalProfile.subjects, ["cat"]);
    assert.deepEqual(result.originalSmartProfile.subjects, ["cat"]);
    assert.deepEqual(result.effectiveSmartProfile.subjects, ["cat", "kitten"]);
    assert.equal(result.finalAutomationDecision.decision, "shadow");
    assert.ok(result.finalObjectiveBlockers.length === 0);
    assert.ok(
      result.finalAutomationDecision.reasonCodes.includes(
        "shadow_would_auto_approve",
      ),
    );
    assert.deepEqual(result.finalSemanticBlockers, []);
    assert.deepEqual(result.deterministicBlockersUnresolved, []);
  });

  it("preserves objective blockers regardless of a successful review", () => {
    const result = projectSemanticReviewPlaygroundResult({
      originalSmartProfile: { ...originalProfile, categoryId: undefined },
      title: "Cat Graphic",
      description: "A cat graphic for catalog search.",
      categoryName: undefined,
      visualContextProfile,
      initialEligibleBlockers: [],
      reviewResult: {
        decision: "APPROVE",
        reason: "The evidence is sufficient.",
        blockersResolved: [],
        blockersUnresolved: [],
      },
      catalogWorkflowMode: "shadow",
      catalogAutonomousLiveEnabled: false,
    });

    assert.ok(result.finalObjectiveBlockers.includes("category_unresolved"));
    assert.equal(result.finalAutomationDecision.wouldAutoApprove, false);
    assert.equal(result.finalAutomationDecision.shouldPublishReady, false);
  });

  it("uses the same bounded VCP evidence before and after Pass 2", () => {
    const profile: DesignSmartProfile = {
      ...originalProfile,
      subjects: ["woman"],
      objects: ["Cowboy hat"],
    };
    const result = projectSemanticReviewPlaygroundResult({
      originalSmartProfile: profile,
      title: "Woman in a jacket",
      description: "A person wearing a jacket.",
      categoryId: "people",
      categoryName: "People",
      visualContextProfile: {
        ...visualContextProfile,
        summary: "A woman wearing a cowboy hat.",
        detailedDescription: "A woman wearing a cowboy hat and jacket.",
        objects: ["Cowboy hat"],
        peopleCharacters: ["woman"],
      },
      initialEligibleBlockers: [],
      reviewResult: {
        decision: "APPROVE",
        reason: "The VCP explicitly supports the profile.",
        blockersResolved: [],
        blockersUnresolved: [],
      },
      catalogWorkflowMode: "shadow",
      catalogAutonomousLiveEnabled: false,
    });
    assert.ok(
      !result.finalSemanticBlockers.includes(
        "structured_evidence_gap:objects:cowboy hat",
      ),
    );
    assert.deepEqual(result.finalObjectiveBlockers, []);
  });

  it("does not re-inject reviewer unresolved blockers after a Frankenstein specificity patch", () => {
    const profile: DesignSmartProfile = {
      ...originalProfile,
      categoryId: "spiritual",
      categoryName: "Spiritual & Mystical",
      subjects: ["Frankenstein's monster", "monster", "dandelion"],
      objects: ["dandelion seeds", "jacket", "shirt", "neck bolts"],
      styles: ["scratchboard"],
      themes: ["gentleness", "nature"],
      interests: ["horror"],
      searchConcepts: ["Frankenstein monster blowing dandelion"],
      colors: ["white", "gray"],
    };
    const result = projectSemanticReviewPlaygroundResult({
      originalSmartProfile: profile,
      title: "Frankenstein Blowing a Dandelion",
      description:
        "Frankenstein's monster gently blows a dandelion in a whimsical illustration.",
      categoryId: "spiritual",
      categoryName: "Spiritual & Mystical",
      visualContextProfile: {
        ...visualContextProfile,
        summary: "Frankenstein's monster blows a dandelion.",
        detailedDescription:
          "Frankenstein's monster stands outdoors and gently blows a dandelion.",
        peopleCharacters: ["Frankenstein's monster"],
        objects: ["dandelion", "dandelion seeds", "jacket"],
      },
      initialEligibleBlockers: ["subject_specificity_risk:monster"],
      reviewResult: {
        decision: "APPROVE_WITH_PATCH",
        reason:
          "The subject 'monster' is too broad. It should be refined to 'Frankenstein's monster' for better specificity.",
        blockersResolved: [],
        blockersUnresolved: ["subject_specificity_risk:monster"],
        patches: [
          {
            field: "subjects",
            from: ["Frankenstein's monster", "monster", "dandelion"],
            to: ["Frankenstein's monster", "dandelion"],
          },
        ],
      },
      catalogWorkflowMode: "shadow",
      catalogAutonomousLiveEnabled: false,
    });

    assert.deepEqual(profile.subjects, [
      "Frankenstein's monster",
      "monster",
      "dandelion",
    ]);
    assert.deepEqual(result.effectiveSmartProfile.subjects, [
      "Frankenstein's monster",
      "dandelion",
    ]);
    assert.deepEqual(result.deterministicBlockersResolved, [
      "subject_specificity_risk:monster",
    ]);
    assert.ok(
      !result.deterministicBlockersUnresolved.includes(
        "subject_specificity_risk:monster",
      ),
    );
    assert.ok(
      !result.finalAutomationDecision.reasonCodes.includes(
        "subject_specificity_risk:monster",
      ),
    );
    assert.ok(
      !result.finalAutomationDecision.reasonCodes.includes(
        "semantic_review_needs_review",
      ),
    );
    assert.deepEqual(result.reviewerReportedBlockers.unresolved, [
      "subject_specificity_risk:monster",
    ]);
  });

  it("keeps semantic diagnostics non-authoritative after unrelated edits", () => {
    const profile: DesignSmartProfile = {
      ...originalProfile,
      categoryId: "spiritual",
      categoryName: "Spiritual & Mystical",
      subjects: ["monster"],
      objects: ["dandelion clock", "seeds"],
      themes: ["whimsical", "juxtaposition", "nature"],
      styles: ["line art"],
      interests: ["horror"],
      searchConcepts: ["dandelion clock"],
      colors: ["white", "black"],
    };
    const result = projectSemanticReviewPlaygroundResult({
      originalSmartProfile: profile,
      title: "Frankenstein Monster with Dandelion",
      description: "Frankenstein monster blows dandelion seeds outdoors.",
      categoryId: "spiritual",
      categoryName: "Spiritual & Mystical",
      visualContextProfile: {
        ...visualContextProfile,
        summary: "A monster blows a dandelion.",
        detailedDescription:
          "A monster blows a dandelion with visible seeds.",
        peopleCharacters: ["monster"],
        objects: ["dandelion", "dandelion seeds"],
      },
      initialEligibleBlockers: [
        "structured_evidence_gap:objects:dandelion clock",
        "subject_specificity_risk:monster",
      ],
      reviewResult: {
        decision: "APPROVE_WITH_PATCH",
        reason: "Objects refined and themes cleaned.",
        blockersResolved: [],
        blockersUnresolved: [
          "structured_evidence_gap:objects:dandelion clock",
          "subject_specificity_risk:monster",
        ],
        patches: [
          {
            field: "objects",
            from: ["dandelion clock", "seeds"],
            to: ["dandelion", "dandelion seeds"],
          },
          {
            field: "themes",
            from: ["whimsical", "juxtaposition", "nature"],
            to: ["whimsical", "nature"],
          },
        ],
      },
      catalogWorkflowMode: "shadow",
      catalogAutonomousLiveEnabled: false,
    });

    assert.deepEqual(result.effectiveSmartProfile.objects, [
      "dandelion",
      "dandelion seeds",
    ]);
    assert.ok(
      result.deterministicBlockersResolved.includes(
        "structured_evidence_gap:objects:dandelion clock",
      ),
    );
    assert.ok(
      !result.deterministicBlockersUnresolved.includes(
        "structured_evidence_gap:objects:dandelion clock",
      ),
    );
    assert.ok(
      result.deterministicBlockersUnresolved.includes(
        "subject_specificity_risk:monster",
      ),
    );
    assert.equal(result.finalAutomationDecision.wouldAutoApprove, true);
    assert.equal(result.finalAutomationDecision.shouldPublishReady, false);
  });

  it("keeps semantic reviewer self-report non-authoritative despite patches", () => {
    const profile: DesignSmartProfile = {
      ...originalProfile,
      subjects: ["woman"],
      objects: ["hat"],
      themes: ["dark"],
    };
    const result = projectSemanticReviewPlaygroundResult({
      originalSmartProfile: profile,
      title: "Abstract graphic",
      description: "An abstract decorative graphic.",
      categoryId: "animals",
      categoryName: "Animals",
      visualContextProfile: {
        ...visualContextProfile,
        summary: "An abstract decorative graphic.",
        detailedDescription: "An abstract decorative printable graphic.",
        objects: ["hat"],
      },
      initialEligibleBlockers: ["structured_evidence_gap:subjects:woman"],
      reviewResult: {
        decision: "APPROVE_WITH_PATCH",
        reason: "Cosmetic themes only.",
        blockersResolved: ["structured_evidence_gap:subjects:woman"],
        blockersUnresolved: [],
        patches: [
          {
            field: "themes",
            from: ["dark"],
            to: ["whimsy"],
          },
        ],
      },
      catalogWorkflowMode: "shadow",
      catalogAutonomousLiveEnabled: false,
    });

    assert.deepEqual(result.deterministicBlockersResolved, []);
    assert.ok(
      result.deterministicBlockersUnresolved.includes(
        "structured_evidence_gap:subjects:woman",
      ),
    );
    assert.equal(result.finalAutomationDecision.wouldAutoApprove, true);
    assert.equal(result.finalAutomationDecision.shouldPublishReady, false);
  });

  it("rejects protected semantic patch fields", () => {
    assert.throws(
      () =>
        projectSemanticReviewPlaygroundResult({
          originalSmartProfile: originalProfile,
          title: "Cat Graphic",
          description: "A cat graphic for catalog search.",
          categoryId: "animals",
          categoryName: "Animals",
          visualContextProfile,
          initialEligibleBlockers: [],
          reviewResult: {
            decision: "APPROVE_WITH_PATCH",
            reason: "Invalid protected patch.",
            blockersResolved: [],
            blockersUnresolved: [],
            patches: [
              { field: "title", from: ["Cat Graphic"], to: ["Dog Graphic"] },
            ] as never,
          },
          catalogWorkflowMode: "shadow",
          catalogAutonomousLiveEnabled: false,
        }),
      /Unsupported semantic review patch field/i,
    );
  });

  it("represents a correlated Pass 2 trace with truthful lifecycle and cost stages", () => {
    const trace: AiEnrichmentTrace = {
      schemaVersion: 1,
      traceId: "pass2-trace",
      parentTraceId: "pass1-trace",
      source: "PLAYGROUND",
      captureFullTrace: false,
      startedAt: new Date(0).toISOString(),
      completedAt: new Date(5).toISOString(),
      lifecycleState: "complete",
      provider: "google",
      model: "gemini-2.5-flash-lite",
      promptVersion: "catalog-semantic-review-v5",
      responseContract: buildSemanticReviewResponseFormat(),
      requestMetadata: { pass1TraceId: "pass1-trace", imageCount: 0 },
      costs: { pass2: { totalUsd: 0.001 } },
      stages: [
        { stage: "created", at: new Date(0).toISOString() },
        { stage: "prompt_ready", at: new Date(1).toISOString() },
        {
          stage: "request_sent",
          at: new Date(2).toISOString(),
          data: { textOnly: true },
        },
        {
          stage: "provider_response",
          at: new Date(3).toISOString(),
          data: { responseContentShape: "string" },
        },
        {
          stage: "parsed",
          at: new Date(4).toISOString(),
          data: { parser: "REACHED" },
        },
        {
          stage: "semantic_review",
          at: new Date(4).toISOString(),
          data: { decision: "APPROVE" },
        },
        {
          stage: "complete",
          at: new Date(5).toISOString(),
          data: { testResult: "PASS" },
        },
      ],
      testResult: "PASS",
    };
    const projection = projectAiEnrichmentTrace(trace);
    assert.equal(trace.source, "PLAYGROUND");
    assert.equal(trace.parentTraceId, "pass1-trace");
    assert.equal(trace.requestMetadata?.imageCount, 0);
    assert.equal(trace.lifecycleState, "complete");
    assert.equal(projection.parserState, "REACHED");
    assert.deepEqual(projection.responseContract, buildSemanticReviewResponseFormat());
    assert.equal(projection.testResult, "PASS");
    assert.deepEqual(trace.costs, { pass2: { totalUsd: 0.001 } });
  });

  it("captures the exact Playground Pass 2 input and rendered prompt boundary", () => {
    const request = {
      visualContextProfile,
      title: "Cat Graphic",
      description: "A cat with whiskers.",
      categoryId: "animals",
      categoryName: "Animals",
      originalSmartProfile: { ...originalProfile, subjects: ["cat", "musicians"] },
      effectiveSmartProfile: { ...originalProfile, subjects: ["cat", "musicians"] },
      blockers: ["structured_evidence_gap:subjects:musicians"],
      objectiveBlockers: [],
      semanticBlockers: ["structured_evidence_gap:subjects:musicians"],
      pass2Eligibility: "eligible" as const,
      visionModelId: "gemini-2.5-flash-lite" as const,
    };
    const diagnostics = buildSemanticReviewPlaygroundPass2Diagnostics({
      request,
      prompt: JSON.stringify({ original: { smartProfile: request.originalSmartProfile } }),
      eligibility: {
        reasonCodes: request.blockers,
        objectiveBlockers: request.objectiveBlockers,
        semanticBlockers: request.semanticBlockers,
      },
    });
    assert.deepEqual(
      (diagnostics.semanticReviewInput?.originalSmartProfile as Record<string, unknown>).subjects,
      ["cat", "musicians"],
    );
    assert.deepEqual(diagnostics.semanticReviewInput?.visualContextProfile, visualContextProfile);
    assert.deepEqual(diagnostics.semanticReviewInput?.eligibleBlockers, request.semanticBlockers);
    assert.equal(
      diagnostics.renderedPrompt?.promptVersion,
      "catalog-semantic-review-v5",
    );
    assert.match(String(diagnostics.renderedPrompt?.userMessage), /musicians/);
    assert.equal(
      (diagnostics.patchValidationInput as Record<string, unknown>).status,
      "NOT_REACHED",
    );
  });
});
