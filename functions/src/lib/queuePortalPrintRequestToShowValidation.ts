import type { QueuePortalPrintRequestToShowRequest } from "../../../packages/shared/src/types/portal/queuePortalPrintRequestToShow.types";

export function validateQueuePortalPrintRequestToShowRequest(data: unknown): QueuePortalPrintRequestToShowRequest {
  if (data === undefined || data === null || typeof data !== "object") {
    throw new Error("Request data must be an object.");
  }

  const payload = data as QueuePortalPrintRequestToShowRequest;

  if (typeof payload.printRequestId !== "string" || !payload.printRequestId.trim()) {
    throw new Error("A print request ID is required.");
  }

  if (typeof payload.upcomingShowId !== "string" || !payload.upcomingShowId.trim()) {
    throw new Error("A show ID is required.");
  }

  return {
    printRequestId: payload.printRequestId.trim(),
    upcomingShowId: payload.upcomingShowId.trim(),
  };
}
