import type { ShowAllocationStatus } from "../showAllocation/showAllocation.enums";

/** Trusted normal Show Queue MOVE scopes (not Did Not Print recovery). */
export type ShowQueueMoveScope = "print_request" | "whole_show";

/** Max source allocations per single atomic apply (cancel+create pairs). */
export const SHOW_QUEUE_MOVE_MAX_ALLOCATIONS = 150;

/** Only pre-production queue statuses may move. */
export const MOVABLE_SHOW_QUEUE_MOVE_STATUSES: readonly ShowAllocationStatus[] = [
  "pending",
  "queued",
];

export type ShowQueueMoveBlockerCode =
  | "source_required"
  | "destination_required"
  | "source_same_as_destination"
  | "source_not_found"
  | "destination_not_found"
  | "source_ineligible"
  | "destination_ineligible"
  | "print_request_required"
  | "no_movable_allocations"
  | "non_movable_allocations"
  | "capacity_exceeded"
  | "too_many_allocations"
  | "checksum_mismatch"
  | "state_changed";

export interface ShowQueueMoveBlocker {
  code: ShowQueueMoveBlockerCode | string;
  message: string;
  allocationId?: string;
  printRequestId?: string;
  status?: string;
}

export interface ShowQueueMoveCapacityBlocker {
  code: "capacity_exceeded";
  message: string;
  projectedAllocatedQuantity: number;
  maxTotalQuantity: number;
}

export interface ShowQueueMoveLine {
  printRequestId: string;
  requestNameSnapshot: string;
  allocationCount: number;
  moveQuantity: number;
  alreadyOnDestination: boolean;
  otherShowAllocationQuantity: number;
}

export interface ShowQueueMoveShowSummary {
  id: string;
  title: string;
  source: string;
  productionStatus: string;
  scheduledStartAtMillis: number | null;
  allocatedQuantity: number;
  maxTotalQuantity?: number;
  projectedAllocatedQuantity?: number;
}

export interface PreviewShowQueueMoveRequest {
  scope: ShowQueueMoveScope;
  sourceShowId: string;
  destinationShowId: string;
  /** Required when scope is `print_request`. */
  printRequestId?: string;
}

export interface PreviewShowQueueMoveResponse {
  scope: ShowQueueMoveScope;
  sourceShow: ShowQueueMoveShowSummary;
  destinationShow: ShowQueueMoveShowSummary;
  printRequestId?: string;
  lines: ShowQueueMoveLine[];
  movableAllocationCount: number;
  affectedPrintRequestCount: number;
  totalMoveQuantity: number;
  destinationCurrentAllocatedQuantity: number;
  destinationProjectedAllocatedQuantity: number;
  maxTotalQuantity?: number;
  printRequestsAlreadyOnDestinationCount: number;
  itemCount: number;
  blockers: ShowQueueMoveBlocker[];
  capacityBlocker: ShowQueueMoveCapacityBlocker | null;
  canApply: boolean;
  previewChecksum: string | null;
  notes: string[];
}

export interface ApplyShowQueueMoveRequest {
  scope: ShowQueueMoveScope;
  sourceShowId: string;
  destinationShowId: string;
  printRequestId?: string;
  previewChecksum: string;
}

export interface ApplyShowQueueMoveResponse {
  outcome: "applied" | "already_applied";
  scope: ShowQueueMoveScope;
  sourceShowId: string;
  destinationShowId: string;
  printRequestId?: string;
  movedAllocationCount: number;
  totalMoveQuantity: number;
  affectedPrintRequestIds: string[];
  sourceAllocatedQuantity: number;
  destinationAllocatedQuantity: number;
  message: string;
}
