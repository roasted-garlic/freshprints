import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AssistedCreationTransitionError,
  assertAssistedCreationTransition,
} from "./assistedCreationTransitions";

describe("assertAssistedCreationTransition", () => {
  it("allows staff to start work from submitted", () => {
    assert.doesNotThrow(() =>
      assertAssistedCreationTransition({
        fromStatus: "submitted",
        toStatus: "in_progress",
        actor: "staff",
      }),
    );
  });

  it("requires a proof asset for proof_ready", () => {
    assert.throws(
      () =>
        assertAssistedCreationTransition({
          fromStatus: "in_progress",
          toStatus: "proof_ready",
          actor: "staff",
          hasProofAsset: false,
        }),
      (error: unknown) =>
        error instanceof AssistedCreationTransitionError && error.code === "proof_required",
    );
  });

  it("allows proof_ready when a proof asset is present", () => {
    assert.doesNotThrow(() =>
      assertAssistedCreationTransition({
        fromStatus: "in_progress",
        toStatus: "proof_ready",
        actor: "staff",
        hasProofAsset: true,
      }),
    );
  });

  it("requires a revision note for revision_requested", () => {
    assert.throws(
      () =>
        assertAssistedCreationTransition({
          fromStatus: "proof_ready",
          toStatus: "revision_requested",
          actor: "customer",
          revisionNote: "   ",
        }),
      (error: unknown) =>
        error instanceof AssistedCreationTransitionError &&
        error.code === "revision_note_required",
    );
  });

  it("allows customer approve from proof_ready", () => {
    assert.doesNotThrow(() =>
      assertAssistedCreationTransition({
        fromStatus: "proof_ready",
        toStatus: "approved",
        actor: "customer",
      }),
    );
  });

  it("requires a reason when staff rejects", () => {
    assert.throws(
      () =>
        assertAssistedCreationTransition({
          fromStatus: "submitted",
          toStatus: "rejected",
          actor: "staff",
          revisionNote: "",
        }),
      (error: unknown) =>
        error instanceof AssistedCreationTransitionError &&
        error.code === "revision_note_required",
    );
  });

  it("allows owner restore from cancelled to submitted with a reason", () => {
    assert.doesNotThrow(() =>
      assertAssistedCreationTransition({
        fromStatus: "cancelled",
        toStatus: "submitted",
        actor: "staff",
        revisionNote: "Reopened after mistaken cancel",
      }),
    );
  });
});
