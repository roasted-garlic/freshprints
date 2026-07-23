import {
  PRINT_REQUEST_ITEM_STATUSES_BLOCKING_HARD_DELETE,
  SHOW_PRODUCTION_STATUSES_BLOCKING_HARD_DELETE,
  type PrintRequestItemStatusBlockingHardDelete,
} from "../../../packages/shared/src/types/deletion/deletion.types";

const BLOCKING_ITEM_STATUS_SET = new Set<string>(PRINT_REQUEST_ITEM_STATUSES_BLOCKING_HARD_DELETE);
const BLOCKING_SHOW_PRODUCTION_SET = new Set<string>(SHOW_PRODUCTION_STATUSES_BLOCKING_HARD_DELETE);

const WORKING_PRINT_REQUEST_STATUSES = new Set(["draft", "active", "editing"]);

export function isWorkingPrintRequestStatus(status: unknown): boolean {
  return typeof status === "string" && WORKING_PRINT_REQUEST_STATUSES.has(status);
}

export function itemStatusBlocksHardDelete(status: unknown): boolean {
  return typeof status === "string" && BLOCKING_ITEM_STATUS_SET.has(status);
}

export function isPrintRequestItemStatusBlockingHardDelete(
  status: string,
): status is PrintRequestItemStatusBlockingHardDelete {
  return BLOCKING_ITEM_STATUS_SET.has(status);
}

export function showProductionStatusBlocksHardDelete(productionStatus: unknown): boolean {
  return typeof productionStatus === "string" && BLOCKING_SHOW_PRODUCTION_SET.has(productionStatus);
}

export function upcomingShowStatusBlocksHardDelete(status: unknown): boolean {
  return status === "completed" || status === "archived";
}

export function isCustomerUploadPromoted(promotedDesignId: unknown): boolean {
  return typeof promotedDesignId === "string" && promotedDesignId.trim().length > 0;
}
