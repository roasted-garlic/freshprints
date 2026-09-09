import type { GetPortalAdminShowQueueRequestDesignsRequest } from "../../../packages/shared/src/types/portal/getPortalAdminShowQueueRequestDesigns.types";
import { invalidArgument } from "./errors";

export const PORTAL_ADMIN_SHOW_QUEUE_IMAGE_TTL_MS = 15 * 60 * 1000;

export function validatePortalAdminShowQueueRequestDesignsRequest(
  data: unknown,
): GetPortalAdminShowQueueRequestDesignsRequest {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw invalidArgument("Invalid designs request.");
  }
  const record = data as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  if (keys.length !== 2 || keys[0] !== "printRequestId" || keys[1] !== "showId") {
    throw invalidArgument("This action requires showId and printRequestId only.");
  }
  const showId = typeof record.showId === "string" ? record.showId.trim() : "";
  const printRequestId = typeof record.printRequestId === "string" ? record.printRequestId.trim() : "";
  if (!showId || !printRequestId) {
    throw invalidArgument("showId and printRequestId are required.");
  }
  return { showId, printRequestId };
}
