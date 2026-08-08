import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isAlreadyTerminalPlainEnqueue,
  isRerunFromReviewEligible,
  parseEnqueueAiEnrichmentRequest,
  shouldAllowAiEnqueueForReviewStatus,
} from "./enqueueAiEnrichmentValidation";

describe("enqueueAiEnrichmentValidation", () => {
  it("allows rerunFromReview for imported needs_review designs", () => {
    const design = { status: "imported", aiReviewStatus: "needs_review" };
    assert.equal(isRerunFromReviewEligible(design), true);
    assert.equal(
      shouldAllowAiEnqueueForReviewStatus(design, { rerunFromReview: true }),
      true,
    );
  });

  it("rejects rerunFromReview for pending processing designs", () => {
    const design = { status: "imported", aiReviewStatus: "pending" };
    assert.equal(isRerunFromReviewEligible(design), false);
  });

  it("blocks automatic enqueue when review status is needs_review", () => {
    const design = { status: "imported", aiReviewStatus: "needs_review" };
    assert.equal(shouldAllowAiEnqueueForReviewStatus(design, {}), false);
  });

  it("parses rerunFromReview request flag", () => {
    assert.deepEqual(
      parseEnqueueAiEnrichmentRequest({ designId: "abc", rerunFromReview: true }),
      {
        designId: "abc",
        rerunRejected: false,
        rerunFromReview: true,
        visionModelIdOverride: undefined,
      },
    );
  });

  it("parses an allowlisted vision model override", () => {
    assert.deepEqual(
      parseEnqueueAiEnrichmentRequest({
        designId: "abc",
        rerunRejected: true,
        visionModelIdOverride: "gemini-3.1-flash-lite",
      }),
      {
        designId: "abc",
        rerunRejected: true,
        rerunFromReview: false,
        visionModelIdOverride: "gemini-3.1-flash-lite",
      },
    );
  });

  it("rejects invalid vision model overrides", () => {
    assert.throws(
      () =>
        parseEnqueueAiEnrichmentRequest({
          designId: "abc",
          rerunRejected: true,
          visionModelIdOverride: "bad-model",
        }),
      /not allowed/i,
    );
  });

  // post-launch-catalog-and-processing-stability, Workstream D: a plain
  // (non-rerun) enqueue call rejected by shouldAllowAiEnqueueForReviewStatus
  // is not automatically a genuine failure — the most common real cause is
  // a stale/duplicate call racing a design that already completed
  // successfully. isAlreadyTerminalPlainEnqueue distinguishes that benign
  // case so the callable can return an idempotent no-op instead of the
  // false "no longer eligible" hard error.
  describe("isAlreadyTerminalPlainEnqueue", () => {
    it("treats a plain enqueue against an already-needs_review design as an idempotent no-op, not a failure", () => {
      const design = { status: "imported", aiReviewStatus: "needs_review" };
      assert.equal(shouldAllowAiEnqueueForReviewStatus(design, {}), false);
      assert.equal(isAlreadyTerminalPlainEnqueue(design, {}), true);
    });

    it("treats a plain enqueue against an already-approved design as an idempotent no-op", () => {
      const design = { status: "ready", aiReviewStatus: "approved" };
      assert.equal(isAlreadyTerminalPlainEnqueue(design, {}), true);
    });

    it("does not classify a genuinely ineligible design (e.g. rejected, no rerun flag) as already-terminal", () => {
      const design = { status: "rejected", aiReviewStatus: "pending" };
      assert.equal(shouldAllowAiEnqueueForReviewStatus(design, {}), true);
      assert.equal(isAlreadyTerminalPlainEnqueue(design, {}), false);
    });

    it("never classifies a rerunFromReview or rerunRejected call as already-terminal, even with needs_review/approved status", () => {
      const needsReviewDesign = { status: "imported", aiReviewStatus: "needs_review" };
      assert.equal(
        isAlreadyTerminalPlainEnqueue(needsReviewDesign, { rerunFromReview: true }),
        false,
      );
      const approvedDesign = { status: "ready", aiReviewStatus: "approved" };
      assert.equal(
        isAlreadyTerminalPlainEnqueue(approvedDesign, { rerunRejected: true }),
        false,
      );
    });

    it("does not classify a design still pending review as already-terminal", () => {
      const design = { status: "imported", aiReviewStatus: "pending" };
      assert.equal(isAlreadyTerminalPlainEnqueue(design, {}), false);
    });

    it("does not classify a staff-rejected review as already-terminal — rejection is a distinct, genuinely blocked outcome, not a stale success", () => {
      const design = { status: "imported", aiReviewStatus: "rejected" };
      assert.equal(shouldAllowAiEnqueueForReviewStatus(design, {}), false);
      assert.equal(isAlreadyTerminalPlainEnqueue(design, {}), false);
    });
  });
});
