export interface UnqueuePortalPrintRequestFromShowRequest {
  printRequestId: string;
  /** Optional when healing a stuck active request that already has no show allocations. */
  upcomingShowId?: string;
}

export interface UnqueuePortalPrintRequestFromShowResponse {
  printRequestId: string;
  upcomingShowId: string;
  canceledAllocationIds: string[];
  releasedQuantity: number;
  requestStatus: "active" | "editing";
}
