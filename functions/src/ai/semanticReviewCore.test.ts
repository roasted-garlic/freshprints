import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applySemanticReviewPatches, buildSemanticReviewPrompt, parseSemanticReviewResult } from "./semanticReviewCore";
import { extractSemanticReviewContent } from "./semanticReviewProvider";

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

  for (const provider of ["gemini", "openai"]) {
    it(`${provider} APPROVE parses with omitted optional arrays`, () => {
      const content = JSON.stringify({ decision: "APPROVE", reason: "Consistent.", });
      const payload = provider === "gemini"
        ? { choices: [{ message: { content: [{ type: "text", text: content }] } }] }
        : { choices: [{ message: { content } }] };
      assert.deepEqual(parseSemanticReviewResult(JSON.parse(extractSemanticReviewContent(payload))), {
        decision: "APPROVE", reason: "Consistent.", blockersResolved: [], blockersUnresolved: [],
      });
    });

    it(`${provider} APPROVE_WITH_PATCH parses a permitted patch`, () => {
      const content = JSON.stringify({ decision: "APPROVE_WITH_PATCH", reason: "Specificity resolved.", blockersResolved: ["subject_specificity_risk:girl"], blockersUnresolved: [], patches: [{ field: "subjects", from: ["girl"], to: ["woman"] }] });
      const payload = provider === "gemini"
        ? { choices: [{ message: { content: [{ type: "text", text: content }] } }] }
        : { choices: [{ message: { content } }] };
      const result = parseSemanticReviewResult(JSON.parse(extractSemanticReviewContent(payload)));
      assert.equal(result.decision, "APPROVE_WITH_PATCH");
      assert.deepEqual(result.patches?.[0].to, ["woman"]);
    });

    it(`${provider} NEEDS_REVIEW parses`, () => {
      const content = JSON.stringify({ decision: "NEEDS_REVIEW", reason: "Evidence is insufficient.", blockersResolved: [], blockersUnresolved: ["subject_specificity_risk:girl"] });
      const payload = provider === "gemini"
        ? { choices: [{ message: { content: [{ type: "text", text: content }] } }] }
        : { choices: [{ message: { content } }] };
      assert.equal(parseSemanticReviewResult(JSON.parse(extractSemanticReviewContent(payload))).decision, "NEEDS_REVIEW");
    });
  }

  it("keeps malformed output fail-closed and rejects forbidden patches", () => {
    assert.equal(parseSemanticReviewResult({ decision: "approve", reason: "x" }).decision, "APPROVE");
    assert.throws(() => parseSemanticReviewResult({ decision: "unknown", reason: "x" }));
    assert.throws(() => parseSemanticReviewResult({ decision: "APPROVE", reason: "x", patches: [{ field: "title", from: [], to: ["x"] }] }));
    assert.throws(() => parseSemanticReviewResult({ decision: "APPROVE", reason: "x", blockersResolved: "none" }));
    assert.deepEqual(parseSemanticReviewResult({ decision: "APPROVE", reason: "x", patches: null }), { decision: "APPROVE", reason: "x", blockersResolved: [], blockersUnresolved: [] });
    assert.throws(() => parseSemanticReviewResult({ decision: "APPROVE", reason: "" }));
  });

  it("normalizes the captured Gemini patch-map response using the current profile", () => {
    const result = parseSemanticReviewResult({ decision: "APPROVE_WITH_PATCH", reason: "The subject 'girl' is too general and could be more specific.", blockersResolved: [], blockersUnresolved: ["subject_specificity_risk:girl"], patches: { subjects: ["pin-up girl"] } }, { subjects: ["girl"] });
    assert.deepEqual(result.patches, [{ field: "subjects", from: ["girl"], to: ["pin-up girl"] }]);
  });

  it("normalizes multi-field maps in canonical field order", () => {
    const result = parseSemanticReviewResult({ decision: "APPROVE_WITH_PATCH", reason: "supported", patches: { objects: ["cucumber"], subjects: ["pin-up girl"] } }, { subjects: ["girl"], objects: ["vegetable"] });
    assert.deepEqual(result.patches, [{ field: "subjects", from: ["girl"], to: ["pin-up girl"] }, { field: "objects", from: ["vegetable"], to: ["cucumber"] }]);
  });

  it("rejects invalid shorthand maps and accepts omitted/null patches", () => {
    assert.throws(() => parseSemanticReviewResult({ decision: "APPROVE", reason: "x", patches: { title: ["x"] } }, { title: ["old"] }));
    assert.throws(() => parseSemanticReviewResult({ decision: "APPROVE", reason: "x", patches: { subjects: "girl" } }, { subjects: ["old"] }));
    assert.deepEqual(parseSemanticReviewResult({ decision: "APPROVE", reason: "x", patches: {} }, { subjects: ["old"] }).patches, undefined);
  });
});
