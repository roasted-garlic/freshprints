/** Structured callable error codes for Portal print-request quota / queue limits. */
export const PRINT_REQUEST_QUOTA_ERROR_CODES = {
  DAILY_PRINT_LIMIT: "DAILY_PRINT_LIMIT",
  /** Working Current Request print total would exceed Cap A (daily) limit. */
  WORKING_REQUEST_PRINT_LIMIT: "WORKING_REQUEST_PRINT_LIMIT",
  SHOW_CUSTOMER_LIMIT: "SHOW_CUSTOMER_LIMIT",
  SHOW_CAPACITY: "SHOW_CAPACITY",
  SHOW_ALLOCATION_BLOCKED: "SHOW_ALLOCATION_BLOCKED",
  /** Portal Add-to-Show past configurable cutoff before show start (ADR-FP-103). */
  SHOW_QUEUE_CUTOFF: "SHOW_QUEUE_CUTOFF",
} as const;

export type PrintRequestQuotaErrorCode =
  (typeof PRINT_REQUEST_QUOTA_ERROR_CODES)[keyof typeof PRINT_REQUEST_QUOTA_ERROR_CODES];

export interface PrintRequestQuotaErrorDetails {
  code: PrintRequestQuotaErrorCode;
  limit?: number;
  cap?: number;
  remaining?: number;
}
