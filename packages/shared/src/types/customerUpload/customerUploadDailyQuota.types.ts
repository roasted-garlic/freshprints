import type { CustomerUploadPurpose } from "./customerUpload.enums";

/** One daily quota counter (upload starts, images, or ZIPs). */
export interface CustomerUploadDailyQuotaBucket {
  used: number;
  limit: number;
  remaining: number;
}

export interface GetCustomerUploadDailyQuotaRequest {
  /** Defaults to print_request when omitted. */
  purpose?: CustomerUploadPurpose;
}

export interface GetCustomerUploadDailyQuotaResponse {
  purpose: CustomerUploadPurpose;
  /**
   * America/Chicago calendar day `yyyy-MM-dd` (field name `utcDay` kept for API compatibility).
   */
  utcDay: string;
  /** create-batch charges (times the customer can start an upload). */
  uploadStarts: CustomerUploadDailyQuotaBucket;
  /** finalize-image charges. */
  images: CustomerUploadDailyQuotaBucket;
  /** finalize-ZIP charges (count/day; separate from byte caps). */
  zips: CustomerUploadDailyQuotaBucket;
  /** Single-image byte cap (shared constant until Settings gains a size field). */
  maxSingleImageBytes: number;
  /** ZIP compressed/decompressed max — fixed 2 GB ceiling for both purposes. */
  maxZipBytes: number;
  /** Max concurrent finalize operations (shared constant). */
  maxConcurrentFinalize: number;
}
