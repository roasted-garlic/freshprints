export type CopyStudioPrintRequestDestinationKind = "customer" | "internal";

export interface CopyStudioPrintRequestRequest {
  sourcePrintRequestId: string;
  destinationKind: CopyStudioPrintRequestDestinationKind;
  destinationCustomerId?: string;
  destinationInternalBaseName?: string;
}

export interface CopyStudioPrintRequestResponse {
  printRequestId: string;
  printRequestName: string;
  isInternal: boolean;
  customerId?: string;
  copiedItemCount: number;
}
