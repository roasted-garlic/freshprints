import type { CatalogWorkflowMode } from "../../constants/catalogWorkflowMode.constants";
import type {
  CatalogReprocessJobStatus,
  CatalogReprocessOutcomeStatus,
  CatalogReprocessTargetType,
} from "../../constants/catalogReprocess.constants";
import {
  REPROCESS_AI_REVIEW_QUEUE_CONFIRMATION_PHRASE,
  REPROCESS_PRODUCTION_AI_REVIEW_CONFIRMATION_PHRASE,
  REPROCESS_PRODUCTION_READY_CATALOG_CONFIRMATION_PHRASE,
  REPROCESS_READY_CATALOG_CONFIRMATION_PHRASE,
} from "../../constants/catalogReprocess.constants";

export type CatalogReprocessEnvironment = "dev" | "production";

export interface CatalogReprocessJobDocument {
  targetType: CatalogReprocessTargetType;
  environment: CatalogReprocessEnvironment;
  projectId: string;
  status: CatalogReprocessJobStatus;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  /** Human-readable pipeline label: prompt + normalizer. */
  pipelineVersion: string;
  promptVersion: string;
  normalizerVersion: string;
  catalogWorkflowModeSnapshot: CatalogWorkflowMode;
  autonomousLiveEnabledSnapshot: boolean;
  totalEligible: number;
  processed: number;
  succeeded: number;
  remainedNeedsReview: number;
  /** Ready Catalog jobs: designs that remained status=ready + aiReviewStatus=approved. */
  remainedReady?: number;
  /** Ready Catalog lifecycle preservation violations (anomaly outcomes). */
  preservationViolations?: number;
  /** Roll-up when category_dominant_intent_conflict appears in reason codes. */
  categoryDominantIntentConflict?: number;
  autoApproved: number;
  wouldAutoApprove: number;
  verifierInvoked: number;
  verifierUnresolved: number;
  hardBlocked: number;
  anomalies: number;
  failed: number;
  retrying: number;
  skipped: number;
  cursorDesignId?: string;
  /** When set, worker processes these IDs instead of paging the eligible query. */
  retryDesignIds?: string[];
  /**
   * Bounded explicit design IDs (canary or owner-selected subset).
   * Worker processes only this list; does not page the full eligible query.
   */
  boundedDesignIds?: string[];
  leaseOwner?: string;
  leaseExpiresAt?: unknown;
  attemptCount?: number;
  maxAttempts?: number;
  pauseRequested?: boolean;
  lastError?: string;
  confirmationPhrase: string;
  dryRun?: boolean;
}

export type CatalogReprocessConfirmationPhrase =
  | typeof REPROCESS_AI_REVIEW_QUEUE_CONFIRMATION_PHRASE
  | typeof REPROCESS_READY_CATALOG_CONFIRMATION_PHRASE
  | typeof REPROCESS_PRODUCTION_AI_REVIEW_CONFIRMATION_PHRASE
  | typeof REPROCESS_PRODUCTION_READY_CATALOG_CONFIRMATION_PHRASE;

export interface CatalogReprocessExclusionBuckets {
  rejectedStatus: number;
  readyStatus: number;
  archivedStatus: number;
  pendingReviewProcessing: number;
  /** Eligible Needs Review designs — mirrored in eligibleCount. */
  eligibleAiReviewQueue: number;
}

export interface CatalogReprocessNotesInventory {
  designsScanned: number;
  designsWithNonEmptyNotes: number;
  maxNoteLength: number;
  /** clear_ok under current A-clear default; escalate_preserve_review if Gate F must stop. */
  recommendation: "clear_ok" | "escalate_preserve_review";
}

export interface CatalogReprocessReadyExclusionBuckets {
  importedNeedsReview: number;
  rejectedStatus: number;
  archivedStatus: number;
  pendingReviewProcessing: number;
  /** Ready designs that are not aiReviewStatus=approved (approximate via ready total − eligible). */
  readyNotApproved: number;
  eligibleReadyCatalog: number;
}

export interface CatalogReprocessTagDensityBuckets {
  zeroTags: number;
  lowTags: number;
  highTags: number;
}

export interface CatalogReprocessReadyInventory {
  eligibleCount: number;
  statusDistribution: Record<string, number>;
  aiReviewStatusDistribution: Record<string, number>;
  promptVersionDistribution: Record<string, number>;
  normalizerVersionDistribution: Record<string, number>;
  alreadyCurrentPipelineCount: number;
  missingProfileCount: number;
  exclusions: CatalogReprocessReadyExclusionBuckets;
  tagDensityBuckets: CatalogReprocessTagDensityBuckets;
  exclusionMethod: "indexed_status_counts";
}

export interface PreviewCatalogReprocessJobRequest {
  targetType: CatalogReprocessTargetType;
}

export interface PreviewCatalogReprocessJobResponse {
  targetType: CatalogReprocessTargetType;
  environment: CatalogReprocessEnvironment;
  projectId: string;
  eligibleCount: number;
  catalogWorkflowMode: CatalogWorkflowMode;
  autonomousLiveEnabled: boolean;
  targetEnabled: boolean;
  unavailableReason?: string;
  requiredConfirmationPhrase: string;
  activeJobId: string | null;
  /** Present when target is enabled and inventory ran. */
  inventory?: {
    statusDistribution: Record<string, number>;
    aiReviewStatusDistribution: Record<string, number>;
    promptVersionDistribution: Record<string, number>;
    normalizerVersionDistribution: Record<string, number>;
    alreadyCurrentPipelineCount: number;
    missingProfileCount: number;
    exclusions: CatalogReprocessExclusionBuckets;
    aiReviewNotes: CatalogReprocessNotesInventory;
    /** True when exclusion counts used indexed status queries (not a full-catalog scan). */
    exclusionMethod: "indexed_status_counts";
  };
  /** Present for ready_catalog when target is enabled and inventory ran. */
  readyInventory?: CatalogReprocessReadyInventory;
}

export interface StartCatalogReprocessJobRequest {
  targetType: CatalogReprocessTargetType;
  confirmationPhrase: string;
  dryRun?: boolean;
  /** Ready Catalog only: explicit bounded design IDs (canary). Max CATALOG_REPROCESS_BOUNDED_DESIGN_IDS_MAX. */
  canaryDesignIds?: string[];
}

export interface StartCatalogReprocessJobResponse {
  jobId: string;
  dryRun: boolean;
  targetType: CatalogReprocessTargetType;
  totalEligible: number;
  status: CatalogReprocessJobStatus;
}

export interface CatalogReprocessJobControlRequest {
  jobId: string;
}

export interface CatalogReprocessJobControlResponse {
  jobId: string;
  status: CatalogReprocessJobStatus;
}

export interface CatalogReprocessOutcomeDocument {
  designId: string;
  status: CatalogReprocessOutcomeStatus;
  startedAt?: string;
  completedAt?: string;
  errorCode?: string;
  errorMessage?: string;
  wouldAutoApprove?: boolean;
  automationDecision?: string;
  automationReasonCodes?: string[];
  verifierInvoked?: boolean;
  verifierOutcome?: string;
  hardBlocked?: boolean;
  categoryGap?: boolean;
  titleValidationIssue?: boolean;
  subjectSpecificityIssue?: boolean;
  contextualSubjectIssue?: boolean;
  promptVersion?: string;
  normalizerVersion?: string;
  finalStatus?: string;
  finalAiReviewStatus?: string;
  remainedNeedsReview?: boolean;
  remainedReady?: boolean;
  categoryDominantIntentConflict?: boolean;
  titleUnchanged?: boolean;
  categoryIdUnchanged?: boolean;
  approvalAuditUnchanged?: boolean;
}
