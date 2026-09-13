import type { DeletionBlocker } from "../deletion/deletion.types";
import type { CUSTOMER_ACCOUNT_MERGE_STAGES } from "../../constants/customerAccountMerge.constants";
import type {
  DuplicateResolutionAuthProviderSummary,
  DuplicateResolutionVerificationSummary,
} from "./customerDuplicateResolution.types";

/** Survivor username outcome during merge preview/apply. */
export type MergeSurvivorUsernameChoice = "keep_survivor" | "use_source";

export type CustomerAccountMergeStage = (typeof CUSTOMER_ACCOUNT_MERGE_STAGES)[number];

export type CustomerAccountMergeJobStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed";

export type MergeContinuableRequestClassification = "none" | "empty" | "meaningful";

export interface MergeContinuablePrintRequestSummary {
  id: string;
  name: string;
  status: string;
  itemCount: number;
  classification: "empty" | "meaningful";
}

export interface MergeContinuablePolicySummary {
  sourceClassification: MergeContinuableRequestClassification;
  survivorClassification: MergeContinuableRequestClassification;
  sourceContinuableRequests: MergeContinuablePrintRequestSummary[];
  survivorContinuableRequests: MergeContinuablePrintRequestSummary[];
  blocked: boolean;
  blockers: DeletionBlocker[];
  /** Empty continuable request ids scheduled for removal during merge. */
  emptyPrintRequestIdsToRemove: string[];
  /** Meaningful source continuable ids scheduled for reassignment (when allowed). */
  sourceMeaningfulPrintRequestIdsToReassign: string[];
}

export interface MergeCustomerIdentitySummary {
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

export interface MergeInventoryCounts {
  printRequests: number;
  showAllocations: number;
  customerUploads: number;
  customerUploadBatches: number;
  assistedCreationRequests: number;
  customerNotifications: number;
  emailDeliveryJobs: number;
  etsyRecommendationRequests: number;
  etsySuggestionRequests: number;
  designIssueReports: number;
  favorites: number;
  webPushSubscriptions: number;
  customRequests: number;
  customerUploadStorageObjects: number;
  assistedCreationStorageObjects: number;
}

export interface MergeStorageMigrationInventory {
  requiresUidMigration: boolean;
  sourceAuthUid: string | null;
  survivorAuthUid: string | null;
  customerUploadStoragePrefix: string | null;
  assistedCreationStoragePrefix: string | null;
}

export type AccountMergeRecommendation =
  | "ELIGIBLE"
  | "BLOCKED_CONTINUABLE_PRINT_REQUESTS"
  | "BLOCKED_IDENTITY_STATE"
  | "BLOCKED_VERIFICATION";

export interface PreviewCustomerAccountMergeRequest {
  sourceCustomerId: string;
  survivorCustomerId: string;
  /** When true, survivor takes source username; default keeps survivor username. */
  useSourceUsername?: boolean;
}

export interface PreviewCustomerAccountMergeResponse {
  outcome: "allowed" | "blocked";
  source: MergeCustomerIdentitySummary;
  survivor: MergeCustomerIdentitySummary;
  useSourceUsername: boolean;
  plannedSurvivorUsername: string;
  sourcePlaceholderUsername: string | null;
  sourceInventory: MergeInventoryCounts;
  survivorInventory: MergeInventoryCounts;
  storageMigration: MergeStorageMigrationInventory;
  continuablePolicy: MergeContinuablePolicySummary;
  verification: DuplicateResolutionVerificationSummary;
  recommendation: AccountMergeRecommendation;
  blockers: DeletionBlocker[];
  mergeStageSummary: CustomerAccountMergeStage[];
  resolutionSummaryLines: string[];
  previewId: string;
  previewChecksum: string;
  previewExpiresAtMillis: number;
}

export interface ApplyCustomerAccountMergeRequest {
  sourceCustomerId: string;
  survivorCustomerId: string;
  useSourceUsername: boolean;
  confirmationPhrase: string;
  previewId: string;
  previewChecksum: string;
  ownerAttestedSameCustomer?: boolean;
  ownerVerificationReason?: string;
  /** Resume an in-progress merge job instead of starting a new one. */
  jobId?: string;
}

export type ApplyCustomerAccountMergeOutcome =
  | "started"
  | "resumed"
  | "completed"
  | "blocked"
  | "rejected"
  | "failed";

export interface ApplyCustomerAccountMergeResponse {
  outcome: ApplyCustomerAccountMergeOutcome;
  message: string;
  jobId: string | null;
  sourceCustomerId: string;
  survivorCustomerId: string;
  previewChecksum: string;
  blockers?: DeletionBlocker[];
}

export interface GetCustomerAccountMergeStatusRequest {
  jobId: string;
}

export interface CustomerAccountMergeJobStageProgress {
  stage: CustomerAccountMergeStage;
  status: "pending" | "in_progress" | "completed" | "failed" | "skipped";
  startedAtMillis?: number;
  completedAtMillis?: number;
  error?: string;
}

export interface CustomerAccountMergeJobDocument {
  jobId: string;
  sourceCustomerId: string;
  survivorCustomerId: string;
  status: CustomerAccountMergeJobStatus;
  stage: CustomerAccountMergeStage;
  createdAtMillis: number;
  startedAtMillis?: number;
  completedAtMillis?: number;
  actorUid: string;
  previewId: string;
  previewChecksum: string;
  useSourceUsername: boolean;
  plannedSurvivorUsername: string;
  sourcePlaceholderUsername?: string;
  stageProgress: CustomerAccountMergeJobStageProgress[];
  lastError?: string;
  retryCount: number;
  /** Collection-specific cursors for idempotent batch stages. */
  cursors?: Record<string, string | null>;
}

export interface GetCustomerAccountMergeStatusResponse {
  job: CustomerAccountMergeJobDocument;
  canRetry: boolean;
}
