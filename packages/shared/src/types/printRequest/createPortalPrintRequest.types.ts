export interface CreatePortalPrintRequestRequest {
  notes?: string;
}

export interface CreatePortalPrintRequestResponse {
  printRequestId: string;
  name: string;
  customerId: string;
}
