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

  it("returns null when not queued", () => {
    assert.equal(
      buildDesignPatchFromEnqueueResult({
        queued: false,
        completed: true,
        reason: "already_processing",
      } as Parameters<typeof buildDesignPatchFromEnqueueResult>[0]),
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
