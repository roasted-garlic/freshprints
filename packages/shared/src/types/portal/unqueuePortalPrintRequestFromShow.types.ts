export interface UnqueuePortalPrintRequestFromShowRequest {
  printRequestId: string;
  upcomingShowId: string;
}

export interface UnqueuePortalPrintRequestFromShowResponse {
  printRequestId: string;
  upcomingShowId: string;
  canceledAllocationIds: string[];
  releasedQuantity: number;
  requestStatus: "active" | "editing";
}
