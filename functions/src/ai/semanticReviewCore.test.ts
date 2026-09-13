import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applySemanticReviewPatches, buildSemanticReviewPrompt, parseSemanticReviewResult, parseSemanticReviewResultWithDiagnostics } from "./semanticReviewCore";
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
    assert.match(prompt, /catalog-semantic-review-v5/);
    assert.match(prompt, /patch map/i);
    assert.match(prompt, /structured_evidence_gap means.*does not mean the field is missing/i);
  });

  it("describes evidence gaps as unsupported existing values", () => {
    const prompt = JSON.parse(buildSemanticReviewPrompt({
      visualContextProfile: { version: "visual-context-v1", summary: "flowers", detailedDescription: "a floral illustration" },
      originalSmartProfile: { subjects: ["Flowers", "Nature"] },
      effectiveSmartProfile: { subjects: ["Flowers", "Nature"] },
      blockers: ["structured_evidence_gap:subjects:nature", "category_unresolved"],
    })) as Record<string, unknown>;
    assert.deepEqual(prompt.eligibleBlockers, ["structured_evidence_gap:subjects:nature"]);
    assert.deepEqual(prompt.eligibleBlockerDetails, [{
      code: "structured_evidence_gap:subjects:nature",
      kind: "structured_evidence_gap",
      field: "subjects",
      value: "nature",
      currentFieldValues: ["Flowers", "Nature"],
      valueAlreadyPresent: true,
      meaning: "The named value is already present in this Smart Profile field, but deterministic contextual evidence does not sufficiently support retaining it.",
      resolutionGuidance: "Remove or replace the value only when the supplied evidence supports that mutation; otherwise return NEEDS_REVIEW with no patches.",
    }]);
  });

  it("describes specificity risks as grounded specificity, not missing generic values", () => {
    const prompt = JSON.parse(buildSemanticReviewPrompt({
      visualContextProfile: { version: "visual-context-v1", summary: "Frankenstein monster", detailedDescription: "Frankenstein's monster blows a dandelion." },
      originalSmartProfile: { subjects: ["monster"] },
      effectiveSmartProfile: { subjects: ["monster"] },
      blockers: ["subject_specificity_risk:monster"],
    })) as Record<string, unknown>;
    const details = prompt.eligibleBlockerDetails as Array<Record<string, unknown>>;
    assert.equal(details[0]?.kind, "subject_specificity_risk");
    assert.equal(details[0]?.field, "subjects");
    assert.equal(details[0]?.valueAlreadyPresent, true);
    assert.match(String(details[0]?.meaning), /generic subject is already represented/i);
    assert.match(String(details[0]?.resolutionGuidance), /grounded specific phrase/i);
  });

  it("rejects category patches and applies approved dimension patches", () => {
    assert.throws(() => parseSemanticReviewResult({ decision: "APPROVE_WITH_PATCH", reason: "x", blockersResolved: [], blockersUnresolved: [], patches: [{ field: "category", from: [], to: ["x"] }] }));
    const result = parseSemanticReviewResult({ decision: "APPROVE_WITH_PATCH", reason: "supported", blockersResolved: ["subject_specificity_risk:girl"], blockersUnresolved: [], patches: [{ field: "subjects", from: ["girl"], to: ["woman"] }] }, { subjects: ["girl"] });
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
      const result = parseSemanticReviewResult(JSON.parse(extractSemanticReviewContent(payload)), { subjects: ["girl"] });
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

  it("keeps malformed output fail-closed with granular validation faults", () => {
    assert.equal(parseSemanticReviewResult({ decision: "approve", reason: "x" }).decision, "APPROVE");
    try {
      parseSemanticReviewResult({ decision: "unknown", reason: "x" });
      assert.fail("expected throw");
    } catch (error) {
      assert.equal(
        (error as { validationFault?: string }).validationFault,
        "invalid_decision",
      );
    }
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

  it("keeps a valid no-safe-resolution result patch-free", () => {
    const result = parseSemanticReviewResult({
      decision: "NEEDS_REVIEW",
      reason: "The supplied evidence does not justify a safe mutation.",
      blockersResolved: [],
      blockersUnresolved: ["structured_evidence_gap:subjects:nature"],
    }, { subjects: ["Flowers", "Nature"] });
    assert.equal(result.decision, "NEEDS_REVIEW");
    assert.equal(result.patches, undefined);
    assert.deepEqual(result.blockersUnresolved, ["structured_evidence_gap:subjects:nature"]);
  });

  it("keeps the captured field/value patch-array dialect fail-closed", () => {
    const original = { subjects: ["Flowers", "Nature"] };
    assert.throws(
      () =>
        parseSemanticReviewResult(
          {
            decision: "APPROVE_WITH_PATCH",
            reason: "The visual context supports the subject update.",
            blockersResolved: [],
            blockersUnresolved: ["structured_evidence_gap:subjects:nature"],
            patches: [
              {
                field: "subjects",
                value: ["Flowers", "Nature", "Wildflowers"],
              },
            ] as never,
          },
          original,
        ),
      (error: unknown) =>
        (error as { validationFault?: string }).validationFault ===
        "patch_validation_failed",
    );
    assert.deepEqual(original, { subjects: ["Flowers", "Nature"] });
  });

  it("rejects stale and canonical no-op patches", () => {
    assert.throws(
      () =>
        parseSemanticReviewResult(
          {
            decision: "APPROVE_WITH_PATCH",
            reason: "stale source",
            patches: [{ field: "subjects", from: ["person"], to: ["woman"] }],
          },
          { subjects: ["girl"] },
        ),
      /source does not match/i,
    );
    assert.throws(
      () =>
        parseSemanticReviewResult(
          {
            decision: "APPROVE_WITH_PATCH",
            reason: "no change",
            patches: [{ field: "subjects", from: ["Girl"], to: ["girl"] }],
          },
          { subjects: ["girl"] },
        ),
      /no-op/i,
    );
    assert.throws(
      () =>
        parseSemanticReviewResult(
          {
            decision: "APPROVE_WITH_PATCH",
            reason: "same values in a different order",
            patches: [
              {
                field: "objects",
                from: ["Cowboy hat", "Suede jacket"],
                to: ["Suede jacket", "Cowboy hat"],
              },
            ],
          },
          { objects: ["Suede jacket", "Cowboy hat"] },
        ),
      /no-op/i,
    );
  });

  it("captures the patch validation boundary without changing no-op semantics", () => {
    assert.throws(
      () =>
        parseSemanticReviewResultWithDiagnostics(
          {
            decision: "APPROVE_WITH_PATCH",
            reason: "The subject is already present.",
            patches: { subjects: ["girl"] },
          },
          { subjects: ["Girl"] },
        ),
      (error: unknown) => {
        const snapshot = (error as {
          patchValidation?: {
            currentSmartProfile?: Record<string, string[]>;
            rawProviderPatch?: unknown;
            parsedPatch?: unknown;
            canonicalFrom?: unknown;
            canonicalTo?: unknown;
            validationResult?: { valid: boolean; reason?: string };
          };
        }).patchValidation;
        assert.deepEqual(snapshot?.currentSmartProfile, { subjects: ["Girl"] });
        assert.deepEqual(snapshot?.rawProviderPatch, { subjects: ["girl"] });
        assert.deepEqual(snapshot?.parsedPatch, [{ field: "subjects", from: ["Girl"], to: ["girl"] }]);
        assert.deepEqual(snapshot?.canonicalFrom, [{ field: "subjects", values: ["girl"] }]);
        assert.deepEqual(snapshot?.canonicalTo, [{ field: "subjects", values: ["girl"] }]);
        assert.equal(snapshot?.validationResult?.valid, false);
        assert.match(snapshot?.validationResult?.reason ?? "", /no-op/i);
        return (error as { validationFault?: string }).validationFault === "patch_validation_failed";
      },
    );
  });

  it("rejects invalid shorthand maps and accepts omitted/null patches", () => {
    assert.throws(() => parseSemanticReviewResult({ decision: "APPROVE", reason: "x", patches: { title: ["x"] } }, { title: ["old"] }));
    assert.throws(() => parseSemanticReviewResult({ decision: "APPROVE", reason: "x", patches: { subjects: "girl" } }, { subjects: ["old"] }));
    assert.deepEqual(parseSemanticReviewResult({ decision: "APPROVE", reason: "x", patches: {} }, { subjects: ["old"] }).patches, undefined);
  });
});
