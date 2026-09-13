import type { Timestamp } from "firebase/firestore";

/** Immutable audit evidence — not lifecycle source-of-truth. */
export type CustomerActivityEventType =
  | "account.username_changed"
  | "account.username_transferred"
  | "account.duplicate_resolution_previewed"
  | "account.disabled"
  | "account.restored"
  | "account.hard_delete_previewed"
  | "account.hard_delete_applied"
  | "account.merge_previewed"
  | "account.merge_started"
  | "account.merge_completed"
  | "account.merge_failed"
  | "account.quota_override_set"
  | "account.quota_override_cleared";

export type CustomerActivityEventDerivation = "live" | "reconstructed";

export type CustomerActivityEventResult = "success" | "blocked" | "already_done" | "failed";

export interface CustomerActivityEventMetadata {
  previousUsername?: string;
  newUsername?: string;
  previewChecksum?: string;
  previewId?: string;
  disabledReason?: string;
  blockerCodes?: string[];
  sourceCustomerId?: string;
  survivorCustomerId?: string;
  priorSourceUsername?: string;
  priorSurvivorUsername?: string;
  transferredUsername?: string;
  verificationMode?: string;
  sourcePlaceholderUsername?: string;
  [key: string]: string | string[] | number | boolean | undefined;
}

export interface CustomerActivityEvent {
  id: string;
  customerId: string;
  eventType: CustomerActivityEventType;
  occurredAt: Timestamp;
  actorUid: string;
  actorRole: "owner" | "admin" | "system";
  derivation: CustomerActivityEventDerivation;
  result?: CustomerActivityEventResult;
  metadata?: CustomerActivityEventMetadata;
}
