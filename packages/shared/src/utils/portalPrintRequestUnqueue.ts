import type { ShowAllocationStatus } from "../types/showAllocation/showAllocation.enums";
import type { ShowProductionStatus } from "../types/upcomingShow/upcomingShow.enums";
import type { PrintRequestClosureKind, PrintRequestOrigin } from "../types/printRequest/printRequest.types";
import { isPrintRequestConvertedToInternal } from "./printRequestConversion";
import { isPortalCustomerOriginPrintRequest } from "./portalPrintRequestEditability";
import { canRemoveRequestFromShow } from "./showQueueEditability";

const CANCELABLE_ALLOCATION_STATUSES: ShowAllocationStatus[] = ["pending", "queued"];

const BLOCKING_ALLOCATION_STATUSES: ShowAllocationStatus[] = [
  "in_progress",
  "printed",
  "done",
];

export interface PortalPrintRequestUnqueueAllocationView {
  id: string;
  upcomingShowId: string;
  status: ShowAllocationStatus;
  allocatedQuantity: number;
}

export type PortalPrintRequestUnqueueRejectReason =
  | "not_portal_customer"
  | "converted_to_internal"
  | "request_closed"
  | "show_not_removable"
  | "production_started"
  | "not_queued_on_show"
  | "continuable_request_conflict";

export interface EvaluatePortalPrintRequestUnqueueResult {
  eligible: boolean;
  reason?: PortalPrintRequestUnqueueRejectReason;
  cancelableAllocationIds: string[];
  releasedQuantity: number;
}

export function evaluatePortalPrintRequestUnqueue(input: {
  request: {
    id: string;
    status: string;
    requestOrigin?: PrintRequestOrigin;
    isInternal?: boolean;
    closureKind?: PrintRequestClosureKind;
  };
  showProductionStatus: ShowProductionStatus;
  allocationsOnShow: PortalPrintRequestUnqueueAllocationView[];
  hasOtherPortalEditableContinuableRequest: boolean;
}): EvaluatePortalPrintRequestUnqueueResult {
  if (!isPortalCustomerOriginPrintRequest({
    requestOrigin: input.request.requestOrigin,
    isInternal: input.request.isInternal === true,
  })) {
    return {
      eligible: false,
      reason: "not_portal_customer",
      cancelableAllocationIds: [],
      releasedQuantity: 0,
    };
  }

  if (isPrintRequestConvertedToInternal(input.request.closureKind as never)) {
    return {
      eligible: false,
      reason: "converted_to_internal",
      cancelableAllocationIds: [],
      releasedQuantity: 0,
    };
  }

  if (input.request.status === "completed" || input.request.status === "archived") {
    return {
      eligible: false,
      reason: "request_closed",
      cancelableAllocationIds: [],
      releasedQuantity: 0,
    };
  }

  if (!canRemoveRequestFromShow(input.showProductionStatus)) {
    return {
      eligible: false,
      reason: "show_not_removable",
      cancelableAllocationIds: [],
      releasedQuantity: 0,
    };
  }

  const activeOnShow = input.allocationsOnShow.filter(
    (allocation) => allocation.status !== "canceled",
  );

  const blockingOnShow = activeOnShow.filter((allocation) =>
    BLOCKING_ALLOCATION_STATUSES.includes(allocation.status),
  );
  if (blockingOnShow.length > 0) {
    return {
      eligible: false,
      reason: "production_started",
      cancelableAllocationIds: [],
      releasedQuantity: 0,
    };
  }

  const cancelable = activeOnShow.filter((allocation) =>
    CANCELABLE_ALLOCATION_STATUSES.includes(allocation.status),
  );

  if (cancelable.length === 0) {
    return {
      eligible: false,
      reason: "not_queued_on_show",
      cancelableAllocationIds: [],
      releasedQuantity: 0,
    };
  }

  if (input.hasOtherPortalEditableContinuableRequest) {
    return {
      eligible: false,
      reason: "continuable_request_conflict",
      cancelableAllocationIds: [],
      releasedQuantity: 0,
    };
  }

  const releasedQuantity = cancelable.reduce(
    (sum, allocation) => sum + allocation.allocatedQuantity,
    0,
  );

  return {
    eligible: true,
    cancelableAllocationIds: cancelable.map((allocation) => allocation.id),
    releasedQuantity,
  };
}
