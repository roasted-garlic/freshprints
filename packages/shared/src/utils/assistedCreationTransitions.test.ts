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

  it("requires a proof asset or catalog suggestion for proof_ready", () => {
    assert.throws(
      () =>
        assertAssistedCreationTransition({
          fromStatus: "in_progress",
          toStatus: "proof_ready",
          actor: "staff",
          hasProofAsset: false,
          hasSuggestedCatalogDesign: false,
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

  it("allows proof_ready when a catalog design suggestion is present without a proof", () => {
    assert.doesNotThrow(() =>
      assertAssistedCreationTransition({
        fromStatus: "in_progress",
        toStatus: "proof_ready",
        actor: "staff",
        hasProofAsset: false,
        hasSuggestedCatalogDesign: true,
      }),
    );
  });

  it("allows customer approve from proof_ready without requiring hasProofAsset", () => {
    assert.doesNotThrow(() =>
      assertAssistedCreationTransition({
        fromStatus: "proof_ready",
        toStatus: "approved",
        actor: "customer",
        // Catalog approve path: no proof asset on the transition input.
        hasProofAsset: false,
        hasSuggestedCatalogDesign: true,
      }),
    );
  });

  it("allows customer approve from proof_ready to final_source_needed", () => {
    assert.doesNotThrow(() =>
      assertAssistedCreationTransition({
        fromStatus: "proof_ready",
        toStatus: "final_source_needed",
        actor: "customer",
      }),
    );
  });

  it("allows customer catalog approve from proof_ready to approved", () => {
    assert.doesNotThrow(() =>
      assertAssistedCreationTransition({
        fromStatus: "proof_ready",
        toStatus: "approved",
        actor: "customer",
        hasSuggestedCatalogDesign: true,
      }),
    );
  });

  it("requires final source for staff complete from final_source_needed", () => {
    assert.throws(
      () =>
        assertAssistedCreationTransition({
          fromStatus: "final_source_needed",
          toStatus: "approved",
          actor: "staff",
          hasFinalSource: false,
        }),
      (error: unknown) =>
        error instanceof AssistedCreationTransitionError &&
        error.code === "final_source_required",
    );
  });

  it("allows staff complete when final source is present", () => {
    assert.doesNotThrow(() =>
      assertAssistedCreationTransition({
        fromStatus: "final_source_needed",
        toStatus: "approved",
        actor: "staff",
        hasFinalSource: true,
      }),
    );
  });

  it("forbids staff force-complete without going through final_source_needed", () => {
    assert.throws(
      () =>
        assertAssistedCreationTransition({
          fromStatus: "proof_ready",
          toStatus: "approved",
          actor: "staff",
          hasFinalSource: true,
        }),
      (error: unknown) =>
        error instanceof AssistedCreationTransitionError && error.code === "invalid_transition",
    );
  });

  it("allows staff cancel from final_source_needed with a reason", () => {
    assert.doesNotThrow(() =>
      assertAssistedCreationTransition({
        fromStatus: "final_source_needed",
        toStatus: "cancelled",
        actor: "staff",
        revisionNote: "Customer withdrew",
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

  it("allows staff reject from submitted with a reason", () => {
    assert.doesNotThrow(() =>
      assertAssistedCreationTransition({
        fromStatus: "submitted",
        toStatus: "rejected",
        actor: "staff",
        revisionNote: "Out of scope",
      }),
    );
  });

  it("forbids staff reject after work has started", () => {
    for (const fromStatus of [
      "in_progress",
      "proof_ready",
      "revision_requested",
      "final_source_needed",
    ] as const) {
      assert.throws(
        () =>
          assertAssistedCreationTransition({
            fromStatus,
            toStatus: "rejected",
            actor: "staff",
            revisionNote: "Too late",
          }),
        (error: unknown) =>
          error instanceof AssistedCreationTransitionError &&
          error.code === "invalid_transition",
      );
    }
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
