export interface QueuePortalPrintRequestToShowRequest {
  printRequestId: string;
  upcomingShowId: string;
}

export interface QueuePortalPrintRequestToShowResponse {
  printRequestId: string;
  upcomingShowId: string;
  allocationIds: string[];
  totalAllocatedQuantity: number;
}
