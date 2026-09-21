export type StaffArtworkAiLifecycleAction =
  | "plain_enqueue"
  | "reprocess_ready"
  | "reset_rejected"
  | "no_op";

export type StaffArtworkAiLifecycleReason =
  | "new_imported_pending"
  | "existing_imported_pending"
  | "existing_ready_approved"
  | "existing_rejected"
  | "already_processing"
  | "already_needs_review"
  | "already_approved"
  | "unsupported_lifecycle"
  | "linked_design_missing";

export interface StaffArtworkAiLifecycleRouting {
  action: StaffArtworkAiLifecycleAction;
  reason: StaffArtworkAiLifecycleReason;
}

export interface PromoteStaffArtworkToAiReviewResponse {
  staffArtworkId: string;
  designId: string;
  alreadyPromoted: boolean;
  removedFromStaffLibrary: true;
  catalogReviewStatus: "sent_to_ai_review";
  enqueueAttempted: false;
  enqueueQueued: false;
  enqueueReason: "deferred_to_client";
  aiLifecycle: StaffArtworkAiLifecycleRouting;
}
