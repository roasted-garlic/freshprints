import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildDesignPatchFromEnqueueResult } from "./enqueueResultPatch";

describe("buildDesignPatchFromEnqueueResult", () => {
  it("returns a patch with recognized terminal fields on a completed run", () => {
    const patch = buildDesignPatchFromEnqueueResult({
      queued: true,
      completed: true,
      aiProcessingStage: "ready_for_review",
      aiReviewStatus: "needs_review",
      status: "imported",
    });

    assert.deepEqual(patch, {
      aiProcessingStage: "ready_for_review",
      aiReviewStatus: "needs_review",
      status: "imported",
    });
  });

  it("surfaces a failed run", () => {
    const patch = buildDesignPatchFromEnqueueResult({
      queued: true,
      completed: true,
      aiProcessingStage: "failed",
      aiReviewStatus: "pending",
      status: null,
    });

    assert.deepEqual(patch, {
      aiProcessingStage: "failed",
      aiReviewStatus: "pending",
    });
  });

  it("returns null when the run did not complete", () => {
    assert.equal(
      buildDesignPatchFromEnqueueResult({
        queued: true,
        completed: false,
        aiProcessingStage: "ready_for_review",
      }),
      null,
    );
  });

  it("returns null when not queued and not already-terminal (e.g. already_processing, genuinely still in flight)", () => {
    assert.equal(
      buildDesignPatchFromEnqueueResult({
        queued: false,
        completed: true,
        reason: "already_processing",
      } as Parameters<typeof buildDesignPatchFromEnqueueResult>[0]),
      null,
    );
  });

  // post-launch-catalog-and-processing-stability, Workstream D: a
  // not-queued, reason: "already_terminal" result is not a failure — the
  // server found the design had already reached its desired terminal
  // state from an earlier call and returned that real current state so
  // the client can reconcile Processing/Needs Review bucket membership
  // without a false "no longer eligible" error.
  it("returns a patch from an already-terminal (not queued) result reflecting the design's real current state", () => {
    const patch = buildDesignPatchFromEnqueueResult({
      queued: false,
      reason: "already_terminal",
      aiProcessingStage: "ready_for_review",
      aiReviewStatus: "needs_review",
      status: "imported",
    });

    assert.deepEqual(patch, {
      aiProcessingStage: "ready_for_review",
      aiReviewStatus: "needs_review",
      status: "imported",
    });
  });

  it("ignores unrecognized fields on an already-terminal result the same as a completed result", () => {
    assert.equal(
      buildDesignPatchFromEnqueueResult({
        queued: false,
        reason: "already_terminal",
        aiProcessingStage: "not_a_stage",
        aiReviewStatus: "bogus",
        status: "nonsense",
      }),
      null,
    );
  });

  it("ignores unrecognized field values and returns null when nothing usable remains", () => {
    assert.equal(
      buildDesignPatchFromEnqueueResult({
        queued: true,
        completed: true,
        aiProcessingStage: "not_a_stage",
        aiReviewStatus: "bogus",
        status: "nonsense",
      }),
      null,
    );
  });

  it("drops only the unrecognized fields and keeps valid ones", () => {
    const patch = buildDesignPatchFromEnqueueResult({
      queued: true,
      completed: true,
      aiProcessingStage: "ready_for_review",
      aiReviewStatus: "bogus",
      status: null,
    });

    assert.deepEqual(patch, { aiProcessingStage: "ready_for_review" });
  });
});
