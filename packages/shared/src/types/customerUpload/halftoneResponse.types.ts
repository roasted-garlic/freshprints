import type { HalftoneSubmitterResponseValue } from "../halftone/halftone.types";

/** Customer callable: record Yes/No for optional human halftone confirmation. */
export type CustomerHalftoneResponseValue = Extract<HalftoneSubmitterResponseValue, "yes" | "no">;

export interface RecordCustomerUploadHalftoneResponseRequest {
  uploadId: string;
  value: CustomerHalftoneResponseValue;
}

export interface RecordCustomerUploadHalftoneResponseResponse {
  uploadId: string;
  value: CustomerHalftoneResponseValue;
}

/** Staff callable: provisional or final Halftone decision on an upload before/during intake. */
export interface RecordCustomerUploadHalftoneStaffDecisionRequest {
  uploadId: string;
  /** true = halftone, false = not halftone */
  value: boolean;
}

export interface RecordCustomerUploadHalftoneStaffDecisionResponse {
  uploadId: string;
  value: boolean;
}
