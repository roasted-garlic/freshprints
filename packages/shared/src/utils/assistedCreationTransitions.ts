import type {
  AssistedCreationStatus,
  AssistedCreationTransitionActor,
} from "../constants/assistedCreation/assistedCreation.constants";
import { isAssistedCreationOpenStatus } from "../constants/assistedCreation/assistedCreation.constants";

export type AssistedCreationTransitionErrorCode =
  | "invalid_transition"
  | "proof_required"
  | "final_source_required"
  | "revision_note_required"
  | "not_open"
  | "forbidden_actor";

export class AssistedCreationTransitionError extends Error {
  readonly code: AssistedCreationTransitionErrorCode;

  constructor(code: AssistedCreationTransitionErrorCode, message: string) {
    super(message);
    this.name = "AssistedCreationTransitionError";
    this.code = code;
  }
}

export interface AssistedCreationTransitionInput {
  fromStatus: AssistedCreationStatus;
  toStatus: AssistedCreationStatus;
  actor: AssistedCreationTransitionActor;
  /** True when at least one proof asset is attached (or being attached in the same write). */
  hasProofAsset?: boolean;
  /**
   * True when a ready catalog design suggestion is attached (or being attached)
   * for catalog_share fulfillment.
   */
  hasSuggestedCatalogDesign?: boolean;
  /**
   * True when final high-res artwork is attached (or being attached) in the same write.
   * Required for staff `final_source_needed` → `approved`.
   */
  hasFinalSource?: boolean;
  revisionNote?: string;
}

const STAFF_ALLOWED: ReadonlyArray<[AssistedCreationStatus, AssistedCreationStatus]> = [
  ["submitted", "in_progress"],
  ["revision_requested", "in_progress"],
  ["in_progress", "proof_ready"],
  ["final_source_needed", "approved"],
  /** Reject only before Start Work — once past submitted, use cancel. */
  ["submitted", "rejected"],
  ["submitted", "cancelled"],
  ["in_progress", "cancelled"],
  ["revision_requested", "cancelled"],
  ["proof_ready", "cancelled"],
  ["final_source_needed", "cancelled"],
  /** Owner restore of a cancelled request back to the intake queue. */
  ["cancelled", "submitted"],
];

const CUSTOMER_ALLOWED: ReadonlyArray<[AssistedCreationStatus, AssistedCreationStatus]> = [
  /** Proof-image approve → Final Source Needed (staff uploads HR artwork next). */
  ["proof_ready", "final_source_needed"],
  /** Catalog-share approve → terminal approved (ADR-FP-108). */
  ["proof_ready", "approved"],
  ["proof_ready", "revision_requested"],
  ["submitted", "cancelled"],
  ["in_progress", "cancelled"],
  ["proof_ready", "cancelled"],
  ["revision_requested", "cancelled"],
  ["final_source_needed", "cancelled"],
];

function isAllowed(
  pairs: ReadonlyArray<[AssistedCreationStatus, AssistedCreationStatus]>,
  from: AssistedCreationStatus,
  to: AssistedCreationStatus,
): boolean {
  return pairs.some(([f, t]) => f === from && t === to);
}

/**
 * Validates a status transition for Assisted Creation proofing.
 * Throws AssistedCreationTransitionError when invalid.
 */
export function assertAssistedCreationTransition(
  input: AssistedCreationTransitionInput,
): void {
  const { fromStatus, toStatus, actor } = input;

  if (fromStatus === toStatus) {
    throw new AssistedCreationTransitionError(
      "invalid_transition",
      "Status is already set to that value.",
    );
  }

  if (actor === "staff") {
    if (!isAllowed(STAFF_ALLOWED, fromStatus, toStatus)) {
      throw new AssistedCreationTransitionError(
        "invalid_transition",
        `Staff cannot move from ${fromStatus} to ${toStatus}.`,
      );
    }
  } else if (actor === "customer") {
    if (!isAllowed(CUSTOMER_ALLOWED, fromStatus, toStatus)) {
      throw new AssistedCreationTransitionError(
        "invalid_transition",
        `Customer cannot move from ${fromStatus} to ${toStatus}.`,
      );
    }
  } else {
    throw new AssistedCreationTransitionError(
      "forbidden_actor",
      "System cannot set this status directly.",
    );
  }

  if (
    toStatus === "proof_ready" &&
    input.hasProofAsset !== true &&
    input.hasSuggestedCatalogDesign !== true
  ) {
    throw new AssistedCreationTransitionError(
      "proof_required",
      "A proof image or catalog design suggestion is required before marking proof ready.",
    );
  }

  if (
    actor === "staff" &&
    fromStatus === "final_source_needed" &&
    toStatus === "approved" &&
    input.hasFinalSource !== true
  ) {
    throw new AssistedCreationTransitionError(
      "final_source_required",
      "Upload final high-resolution artwork before completing this request.",
    );
  }

  if (toStatus === "revision_requested") {
    const note = (input.revisionNote ?? "").trim();
    if (note.length === 0) {
      throw new AssistedCreationTransitionError(
        "revision_note_required",
        "Add a revision note so staff know what to change.",
      );
    }
  }

  if (
    actor === "staff" &&
    (toStatus === "rejected" || toStatus === "cancelled" || (fromStatus === "cancelled" && toStatus === "submitted"))
  ) {
    const note = (input.revisionNote ?? "").trim();
    if (note.length === 0) {
      throw new AssistedCreationTransitionError(
        "revision_note_required",
        toStatus === "submitted"
          ? "Add a reason for restoring this request."
          : toStatus === "rejected"
            ? "Add a reason for rejecting this request."
            : "Add a reason for cancelling this request.",
      );
    }
  }
}

export function assertAssistedCreationIsOpen(status: AssistedCreationStatus): void {
  if (!isAssistedCreationOpenStatus(status)) {
    throw new AssistedCreationTransitionError(
      "not_open",
      "This request is already closed.",
    );
  }
}
