import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveStaffArtworkAiLifecycleRouting } from "./staffArtworkAiLifecycle";

describe("Staff Artwork AI lifecycle routing", () => {
  it("plain-enqueues new and existing imported pending designs", () => {
    assert.deepEqual(
      resolveStaffArtworkAiLifecycleRouting(null, { isNewDesign: true }),
      { action: "plain_enqueue", reason: "new_imported_pending" },
    );
    assert.deepEqual(
      resolveStaffArtworkAiLifecycleRouting({ status: "imported", aiReviewStatus: "pending" }),
      { action: "plain_enqueue", reason: "existing_imported_pending" },
    );
  });

  it("routes ready approved designs through dedicated reprocess and rejected designs through reset", () => {
    assert.deepEqual(
      resolveStaffArtworkAiLifecycleRouting({ status: "ready", aiReviewStatus: "approved" }),
      { action: "reprocess_ready", reason: "existing_ready_approved" },
    );
    assert.deepEqual(
      resolveStaffArtworkAiLifecycleRouting({ status: "rejected" }),
      { action: "reset_rejected", reason: "existing_rejected" },
    );
  });

  it("never routes terminal, active, or unsupported states to plain enqueue", () => {
    for (const design of [
      { status: "processing", aiReviewStatus: "pending" },
      { status: "imported", aiReviewStatus: "pending", aiProcessingStage: "queued" },
      { status: "imported", aiReviewStatus: "needs_review" },
      { status: "ready", aiReviewStatus: "approved" as const, aiProcessingStage: "ready_for_review" },
      { status: "archived", aiReviewStatus: "approved" },
      undefined,
    ]) {
      const routing = resolveStaffArtworkAiLifecycleRouting(design);
      assert.notEqual(routing.action, "plain_enqueue");
      assert.equal(routing.action === "no_op" || routing.action === "reprocess_ready", true);
    }
  });
});
