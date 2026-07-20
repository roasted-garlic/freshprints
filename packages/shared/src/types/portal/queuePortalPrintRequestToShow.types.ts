/**
 * Portal queue-to-show: entire Continuable request → exactly one show, atomically.
 * Stale clients must not send `selections` (rejected with soft-reload message).
 * No remainder request is ever created.
 */
export interface QueuePortalPrintRequestToShowRequest {
  printRequestId: string;
  upcomingShowId: string;
  /** Required: customer checked the public-bidding understanding box. */
  biddingAcknowledgmentAccepted: boolean;
  /** Must match current PORTAL_BIDDING_ACKNOWLEDGMENT_VERSION. */
  biddingAcknowledgmentVersion: string;
}

export interface QueuePortalPrintRequestToShowResponse {
  printRequestId: string;
  upcomingShowId: string;
  allocationIds: string[];
  totalAllocatedQuantity: number;
  /** Always true on success: this request is fully allocated to the chosen show. */
  isFullyQueued: true;
  /** Always 0 on success (no remainder / partial queue). */
  remainingUnallocatedQuantity: 0;
}
