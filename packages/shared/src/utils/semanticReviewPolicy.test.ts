import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canRunSemanticReview, getSemanticReviewEligibleBlockers, validateSemanticReviewPatches } from "./semanticReviewPolicy";

const context = { version: "visual-context-v1" as const, summary: "A woman with flowers", detailedDescription: "A clearly depicted person and floral artwork." };

describe("semantic review policy", () => {
  it("only makes semantic evidence and specificity blockers eligible", () => {
    assert.deepEqual(getSemanticReviewEligibleBlockers([
      "structured_evidence_gap:subjects:people", "validation:bad", "category_unresolved", "subject_specificity_risk:woman",
    ]), ["structured_evidence_gap:subjects:people", "subject_specificity_risk:woman"]);
  });

  it("fails closed when objective blockers or context are missing", () => {
    assert.equal(canRunSemanticReview({ enabled: true, objectiveBlockers: ["title:title_missing"], semanticBlockers: ["subject_specificity_risk:woman"], visualContextProfile: context }), false);
    assert.equal(canRunSemanticReview({ enabled: true, objectiveBlockers: [], semanticBlockers: ["subject_specificity_risk:woman"] }), false);
  });

  it("accepts only allowlisted SP patch fields", () => {
    assert.equal(validateSemanticReviewPatches([{ field: "subjects", from: ["girl"], to: ["woman"] }]).valid, true);
    assert.equal(validateSemanticReviewPatches([{ field: "category" as never, from: [], to: ["people"] }]).valid, false);
  });
});
