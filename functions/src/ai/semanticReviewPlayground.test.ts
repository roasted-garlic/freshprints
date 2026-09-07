import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { DesignSmartProfile } from "../../../packages/shared/src/types/catalog/smartProfile.types";
import { projectSemanticReviewPlaygroundResult } from "./semanticReviewPlayground";

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
  });

  it("preserves objective blockers regardless of a successful review", () => {
    const result = projectSemanticReviewPlaygroundResult({
      originalSmartProfile: { ...originalProfile, categoryId: undefined },
      title: "Cat Graphic",
      description: "A cat graphic for catalog search.",
      categoryName: undefined,
      visualContextProfile,
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
});
