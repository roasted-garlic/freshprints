export interface ConvertCustomerPrintRequestToInternalRequest {
  printRequestId: string;
  internalBaseName?: string;
  confirmCancelAllocations?: boolean;
}

export interface ConvertCustomerPrintRequestToInternalResponse {
  customerRequestId: string;
  internalRequestId: string;
  internalRequestName: string;
  canceledAllocationIds: string[];
  alreadyConverted: boolean;
}
