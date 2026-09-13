import type { DeletionBlocker } from "../deletion/deletion.types";

export type DuplicateVerificationMode = "verified_email" | "owner_attested";

export type DuplicateVerificationStatus = "verified" | "needs_owner_confirmation" | "blocked";

export type DuplicateResolutionRecommendation =
  | "ELIGIBLE_FOR_TRANSFER_AND_DISABLE"
  | "ELIGIBLE_FOR_TRANSFER_ONLY"
  | "BLOCKED_CONTINUABLE_PRINT_REQUESTS"
  | "BLOCKED_IDENTITY_STATE"
  | "HISTORY_EXISTS_MERGE_REQUIRED";

export interface DuplicateResolutionAuthProviderSummary {
  providerId: string;
  email: string | null;
  emailVerified: boolean | null;
}

export interface DuplicateResolutionCustomerIdentitySummary {
  customerId: string;
  userId: string | null;
  username: string | null;
  displayName: string;
  email: string | null;
  isDisabled: boolean;
  isDeleted: boolean;
  isMerged: boolean;
  authProviders: DuplicateResolutionAuthProviderSummary[];
}

export interface ContinuablePrintRequestSummary {
  id: string;
  name: string;
  status: string;
}

export interface DuplicateResolutionUsernameReservationSummary {
  desiredUsername: string;
  ownerCustomerId: string | null;
  ownedBySource: boolean;
  ownedBySurvivor: boolean;
  ownedByThirdParty: boolean;
}

export interface DuplicateResolutionVerificationSummary {
  status: DuplicateVerificationStatus;
  mode: DuplicateVerificationMode | null;
  reasons: string[];
  requiresOwnerAttestation: boolean;
  requiresOwnerVerificationReason: boolean;
}

export interface PreviewDuplicateAccountResolutionRequest {
  sourceCustomerId: string;
  survivorCustomerId: string;
  desiredUsername?: string;
}

export interface PreviewDuplicateAccountResolutionResponse {
  outcome: "allowed" | "blocked";
  source: DuplicateResolutionCustomerIdentitySummary;
  survivor: DuplicateResolutionCustomerIdentitySummary;
  desiredUsername: string;
  usernameReservation: DuplicateResolutionUsernameReservationSummary;
  sourceContinuablePrintRequests: ContinuablePrintRequestSummary[];
  survivorContinuablePrintRequests: ContinuablePrintRequestSummary[];
  sourceHistoryBlockerCounts: Record<string, number>;
  survivorHistoryBlockerCounts: Record<string, number>;
  verification: DuplicateResolutionVerificationSummary;
  recommendation: DuplicateResolutionRecommendation;
  blockers: DeletionBlocker[];
  plannedSourceDisposition: "transfer_and_disable";
  resolutionSummaryLines: string[];
  previewId: string;
  previewChecksum: string;
  previewExpiresAtMillis: number;
}

export type TransferCustomerUsernameOutcome =
  | "success"
  | "partial_success"
  | "blocked"
  | "rejected";

export interface TransferCustomerUsernameRequest {
  previewId: string;
  previewChecksum: string;
  sourceCustomerId: string;
  survivorCustomerId: string;
  desiredUsername: string;
  confirmationPhrase: string;
  ownerAttestedSameCustomer?: boolean;
  ownerVerificationReason?: string;
}

export interface TransferCustomerUsernameResponse {
  outcome: TransferCustomerUsernameOutcome;
  message: string;
  sourceCustomerId: string;
  survivorCustomerId: string;
  transferredUsername: string;
  priorSourceUsername: string;
  priorSurvivorUsername: string;
  sourcePlaceholderUsername: string;
  verificationMode: DuplicateVerificationMode;
  previewChecksum: string;
  propagationStatus?: "completed" | "in_progress" | "failed";
  propagationWarning?: string;
  sourceDisableOutcome?: "success" | "failed" | "skipped";
  sourceDisableMessage?: string;
  authDisableFailed?: boolean;
  blockers?: DeletionBlocker[];
}
