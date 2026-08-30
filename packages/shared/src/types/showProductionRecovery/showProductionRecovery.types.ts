/** Max length for owner override reason (documented in DATA_MODEL / ADR-FP-149). */
export const PRODUCTION_OVERRIDE_REASON_MAX_LENGTH = 500;

export type ShowProductionResolutionKind =
  | "empty_closure"
  | "fulfilled_confirmed"
  | "unfulfilled_release"
  | "unfulfilled_requeue"
  | "owner_override";

export type ShowProductionRecoveryAction =
  | "close_empty"
  | "mark_fulfilled"
  | "release_unfulfilled"
  | "requeue_unfulfilled"
  | "force_completed";

export type ShowProductionRecoveryOutcome =
  | "applied"
  | "already_terminal"
  | "blocked"
  | "invalid_action";

export interface ShowProductionRecoveryBlocker {
  code: string;
  message: string;
}

export interface ShowProductionRecoveryRequestEffect {
  printRequestId: string;
  requestNameSnapshot: string;
  currentPersistedStatus: string;
  predictedPersistedStatus: string;
  predictedQueueTab: string | null;
  otherShowAllocationCount: number;
  otherShowAllocationQuantity: number;
}

export interface ShowProductionRequeueLine {
  printRequestId: string;
  requestNameSnapshot: string;
  allocationCount: number;
  requeueQuantity: number;
  otherShowAllocationQuantity: number;
}

export interface ShowProductionRequeueTargetShow {
  id: string;
  title: string;
  scheduledStartAtMillis: number | null;
  source: string;
  maxTotalQuantity?: number;
  allocatedQuantity: number;
  projectedAllocatedQuantity: number;
}

export interface ShowProductionRecoveryCapacityBlocker {
  code: "capacity_exceeded" | "target_full";
  message: string;
  projectedAllocatedQuantity: number;
  maxTotalQuantity: number;
}

export interface PreviewShowProductionRecoveryRequest {
  upcomingShowId: string;
  action: ShowProductionRecoveryAction;
  /** Required when action is `requeue_unfulfilled`. */
  targetUpcomingShowId?: string;
  /** Required when action is `force_completed`. */
  overrideReason?: string;
}

export interface PreviewShowProductionRecoveryResponse {
  outcome: ShowProductionRecoveryOutcome;
  action: ShowProductionRecoveryAction;
  upcomingShowId: string;
  showLabel: string;
  productionStatus: string;
  blockers: ShowProductionRecoveryBlocker[];
  notes: string[];
  activeAllocationCount: number;
  finishableAllocationCount: number;
  activeAllocationQuantity: number;
  affectedPrintRequestCount: number;
  productionStarted: boolean;
  otherShowAllocationWarning: boolean;
  requestEffects: ShowProductionRecoveryRequestEffect[];
  predictedResolutionKind: ShowProductionResolutionKind | null;
  /** Present when action is `requeue_unfulfilled` and preview is computable. */
  previewChecksum?: string;
  targetShow?: ShowProductionRequeueTargetShow;
  requeueLines?: ShowProductionRequeueLine[];
  totalRequeueQuantity?: number;
  capacityBlocker?: ShowProductionRecoveryCapacityBlocker;
}

export interface ApplyShowProductionRecoveryRequest {
  upcomingShowId: string;
  action: ShowProductionRecoveryAction;
  /** Required when action is `requeue_unfulfilled`. */
  targetUpcomingShowId?: string;
  /** Required when action is `requeue_unfulfilled`. */
  previewChecksum?: string;
  /** Required when action is `force_completed`. */
  overrideReason?: string;
}

export interface ApplyShowProductionRecoveryResponse {
  outcome: ShowProductionRecoveryOutcome;
  action: ShowProductionRecoveryAction;
  upcomingShowId: string;
  message: string;
  blockers?: ShowProductionRecoveryBlocker[];
  affectedPrintRequestIds: string[];
  productionResolutionKind?: ShowProductionResolutionKind;
}
