import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canRunSemanticReview,
  describeSemanticReviewBlockers,
  deriveSemanticReviewBlockerResolution,
  getSemanticReviewEligibleBlockers,
  getSemanticReviewObjectiveBlockers,
  validateSemanticReviewPatches,
} from "./semanticReviewPolicy";

const context = {
  version: "visual-context-v1" as const,
  summary: "A woman with flowers",
  detailedDescription: "A clearly depicted person and floral artwork.",
};

describe("semantic review policy", () => {
  it("only makes semantic evidence and specificity blockers eligible", () => {
    assert.deepEqual(
      getSemanticReviewEligibleBlockers([
        "structured_evidence_gap:subjects:people",
        "validation:bad",
        "category_unresolved",
        "subject_specificity_risk:woman",
      ]),
      [
        "structured_evidence_gap:subjects:people",
        "subject_specificity_risk:woman",
      ],
    );
  });

  it("derives resolved and unresolved blockers from deterministic set difference", () => {
    assert.deepEqual(
      deriveSemanticReviewBlockerResolution({
        initialEligibleBlockers: [
          "subject_specificity_risk:monster",
          "structured_evidence_gap:objects:dandelion clock",
          "title:title_missing",
        ],
        finalEligibleBlockers: ["subject_specificity_risk:monster"],
      }),
      {
        resolvedBlockers: ["structured_evidence_gap:objects:dandelion clock"],
        unresolvedBlockers: ["subject_specificity_risk:monster"],
      },
    );
  });

  it("ignores false reviewer clearance when the blocker remains final", () => {
    const derived = deriveSemanticReviewBlockerResolution({
      initialEligibleBlockers: ["subject_specificity_risk:monster"],
      finalEligibleBlockers: ["subject_specificity_risk:monster"],
    });
    assert.deepEqual(derived.resolvedBlockers, []);
    assert.deepEqual(derived.unresolvedBlockers, [
      "subject_specificity_risk:monster",
    ]);
  });

  it("separates eligible semantic blockers from objective authority blockers", () => {
    assert.deepEqual(
      getSemanticReviewObjectiveBlockers([
        "structured_evidence_gap:subjects:people",
        "category_unresolved",
        "title:title_missing",
      ]),
      ["category_unresolved", "title:title_missing"],
    );
  });

  it("describes evidence gaps as existing values lacking support", () => {
    assert.deepEqual(
      describeSemanticReviewBlockers({
        blockers: ["structured_evidence_gap:subjects:nature"],
        currentSmartProfile: { subjects: ["Flowers", "Nature"] },
      }),
      [{
        code: "structured_evidence_gap:subjects:nature",
        kind: "structured_evidence_gap",
        field: "subjects",
        value: "nature",
        currentFieldValues: ["Flowers", "Nature"],
        valueAlreadyPresent: true,
        meaning: "The named value is already present in this Smart Profile field, but deterministic contextual evidence does not sufficiently support retaining it.",
        resolutionGuidance: "Remove or replace the value only when the supplied evidence supports that mutation; otherwise return NEEDS_REVIEW with no patches.",
      }],
    );
  });

  it("describes specificity risks without inventing a phrase", () => {
    const [detail] = describeSemanticReviewBlockers({
      blockers: ["subject_specificity_risk:monster"],
      currentSmartProfile: { subjects: ["monster"] },
    });
    assert.equal(detail?.kind, "subject_specificity_risk");
    assert.equal(detail?.field, "subjects");
    assert.equal(detail?.value, "monster");
    assert.equal(detail?.valueAlreadyPresent, true);
    assert.match(detail?.meaning ?? "", /generic subject is already represented/i);
    assert.match(detail?.resolutionGuidance ?? "", /grounded specific phrase/i);
  });

  it("fails closed when objective blockers or context are missing", () => {
    assert.equal(
      canRunSemanticReview({
        enabled: true,
        objectiveBlockers: ["title:title_missing"],
        semanticBlockers: ["subject_specificity_risk:woman"],
        visualContextProfile: context,
      }),
      false,
    );
    assert.equal(
      canRunSemanticReview({
        enabled: true,
        objectiveBlockers: [],
        semanticBlockers: ["subject_specificity_risk:woman"],
      }),
      false,
    );
  });

  it("accepts only allowlisted SP patch fields", () => {
    assert.equal(
      validateSemanticReviewPatches(
        [{ field: "subjects", from: ["girl"], to: ["woman"] }],
        [],
        { subjects: ["girl"] },
      ).valid,
      true,
    );
    assert.equal(
      validateSemanticReviewPatches([
        { field: "category" as never, from: [], to: ["people"] },
      ]).valid,
      false,
    );
  });

  it("rejects stale and canonical no-op patches", () => {
    assert.equal(
      validateSemanticReviewPatches(
        [{ field: "subjects", from: ["person"], to: ["woman"] }],
        [],
        { subjects: ["girl"] },
      ).reason,
      "Semantic review patch source does not match the current effective profile.",
    );
    assert.equal(
      validateSemanticReviewPatches(
        [{ field: "subjects", from: ["Girl"], to: ["girl"] }],
        [],
        { subjects: ["girl"] },
      ).reason,
      "Semantic review patch is a no-op after canonical normalization.",
    );
  });
});
