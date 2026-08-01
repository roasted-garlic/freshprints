import {
  PORTAL_PRINT_REQUEST_SHOW_SCHEDULE_BATCH_MAX,
  formatPortalPrintRequestShowScheduleBatchCapMessage,
} from "../../../packages/shared/src/utils/portalCustomerShowSchedule";
import type { GetPortalPrintRequestShowSchedulesRequest } from "../../../packages/shared/src/types/portal/getPortalPrintRequestShowSchedules.types";

export function validateGetPortalPrintRequestShowSchedulesRequest(
  data: unknown,
): GetPortalPrintRequestShowSchedulesRequest {
  if (!data || typeof data !== "object") {
    throw new Error("Print request ids are required.");
  }

  const rawIds = (data as { printRequestIds?: unknown }).printRequestIds;

  if (!Array.isArray(rawIds)) {
    throw new Error("Print request ids must be an array.");
  }

  if (rawIds.length === 0) {
    throw new Error("At least one print request id is required.");
  }

  if (rawIds.length > PORTAL_PRINT_REQUEST_SHOW_SCHEDULE_BATCH_MAX) {
    throw new Error(formatPortalPrintRequestShowScheduleBatchCapMessage());
  }

  const seen = new Set<string>();
  const printRequestIds: string[] = [];

  for (const rawId of rawIds) {
    if (typeof rawId !== "string") {
      throw new Error("Each print request id must be a non-empty string.");
    }

    const trimmed = rawId.trim();
    if (!trimmed) {
      throw new Error("Each print request id must be a non-empty string.");
    }

    if (seen.has(trimmed)) {
      throw new Error("Print request ids must be unique.");
    }

    seen.add(trimmed);
    printRequestIds.push(trimmed);
  }

  return { printRequestIds };
}
