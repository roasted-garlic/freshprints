import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applySemanticReviewPatches, buildSemanticReviewPrompt, parseSemanticReviewResult } from "./semanticReviewCore";

describe("semanticReviewCore", () => {
  it("builds a text-only prompt with only eligible blockers", () => {
    const prompt = buildSemanticReviewPrompt({
      visualContextProfile: { version: "visual-context-v1", summary: "woman", detailedDescription: "woman illustration" },
      originalSmartProfile: { subjects: ["girl"] }, effectiveSmartProfile: { subjects: ["girl"] },
      blockers: ["subject_specificity_risk:girl", "title:title_missing"],
    });
    assert.match(prompt, /subject_specificity_risk/);
    assert.doesNotMatch(prompt, /title:title_missing/);
  });

  it("rejects category patches and applies approved dimension patches", () => {
    assert.throws(() => parseSemanticReviewResult({ decision: "APPROVE_WITH_PATCH", reason: "x", blockersResolved: [], blockersUnresolved: [], patches: [{ field: "category", from: [], to: ["x"] }] }));
    const result = parseSemanticReviewResult({ decision: "APPROVE_WITH_PATCH", reason: "supported", blockersResolved: ["subject_specificity_risk:girl"], blockersUnresolved: [], patches: [{ field: "subjects", from: ["girl"], to: ["woman"] }] });
    assert.deepEqual(applySemanticReviewPatches({ subjects: ["girl"] }, result), { subjects: ["woman"] });
  });
});
