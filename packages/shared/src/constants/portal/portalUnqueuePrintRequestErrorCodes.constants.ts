/** Structured callable error codes for Portal unqueue-from-show. */
export const PORTAL_UNQUEUE_PRINT_REQUEST_ERROR_CODES = {
  CONTINUABLE_REQUEST_CONFLICT: "continuable-request-conflict",
  PRODUCTION_STARTED: "production-started",
  SHOW_NOT_REMOVABLE: "show-not-removable",
  NOT_QUEUED: "not-queued",
  NOT_EDITABLE_ORIGIN: "not-editable-origin",
} as const;

export type PortalUnqueuePrintRequestErrorCode =
  (typeof PORTAL_UNQUEUE_PRINT_REQUEST_ERROR_CODES)[keyof typeof PORTAL_UNQUEUE_PRINT_REQUEST_ERROR_CODES];

export interface PortalUnqueuePrintRequestErrorDetails {
  code: PortalUnqueuePrintRequestErrorCode;
}

export const PORTAL_UNQUEUE_CONTINUABLE_REQUEST_CONFLICT_MESSAGE =
  "You already have another request being edited. Finish or queue that request before removing this one from the show.";
