import { PORTAL_BIDDING_ACKNOWLEDGMENT_VERSION } from "../../../packages/shared/src/constants/portal/portalBiddingAcknowledgment.constants";
import type { QueuePortalPrintRequestToShowRequest } from "../../../packages/shared/src/types/portal/queuePortalPrintRequestToShow.types";

/** Stale Cap B choose-prints clients send `selections`; reject with soft-reload guidance. */
export const STALE_QUEUE_SELECTIONS_MESSAGE =
  "This app version is out of date. Soft-reload or refresh the page, then add your full request to a show (partial choose-prints is no longer supported).";

export function validateQueuePortalPrintRequestToShowRequest(
  data: unknown,
): QueuePortalPrintRequestToShowRequest {
  if (data === undefined || data === null || typeof data !== "object") {
    throw new Error("Request data must be an object.");
  }

  const payload = data as Record<string, unknown>;

  if (typeof payload.printRequestId !== "string" || !payload.printRequestId.trim()) {
    throw new Error("A print request ID is required.");
  }

  if (typeof payload.upcomingShowId !== "string" || !payload.upcomingShowId.trim()) {
    throw new Error("A show ID is required.");
  }

  if (payload.biddingAcknowledgmentAccepted !== true) {
    throw new Error("Confirm that you understand these designs are available for public bidding.");
  }

  if (
    typeof payload.biddingAcknowledgmentVersion !== "string" ||
    payload.biddingAcknowledgmentVersion.trim() !== PORTAL_BIDDING_ACKNOWLEDGMENT_VERSION
  ) {
    throw new Error("Bidding acknowledgment is out of date. Refresh the page and try again.");
  }

  // Reject stale choose-prints / remainder clients — never ignore selections (could queue full unexpectedly).
  if ("selections" in payload && payload.selections !== undefined) {
    throw new Error(STALE_QUEUE_SELECTIONS_MESSAGE);
  }

  return {
    printRequestId: payload.printRequestId.trim(),
    upcomingShowId: payload.upcomingShowId.trim(),
    biddingAcknowledgmentAccepted: true,
    biddingAcknowledgmentVersion: PORTAL_BIDDING_ACKNOWLEDGMENT_VERSION,
  };
}
