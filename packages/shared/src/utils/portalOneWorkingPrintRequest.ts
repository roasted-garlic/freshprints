/**
 * Portal customers may have at most one continuable (`draft` / `editing`) print request.
 * Used by create callable and client create gates.
 */
export const PORTAL_ONE_WORKING_REQUEST_MESSAGE =
  "You already have a request in progress. Finish editing it or add it to a show before starting a new one.";

/** Pre-D: upload-backed items cannot enter show queue until Sub-phase D. */
export const PORTAL_UPLOAD_ITEMS_NOT_QUEUEABLE_MESSAGE =
  "Custom artwork on this request isn’t ready for show queue yet. Catalog-only requests can still be queued.";

/** Fail-closed when more than one continuable request exists (data integrity). */
export const PORTAL_MULTIPLE_WORKING_REQUESTS_MESSAGE =
  "More than one open request was found for your account. Contact support before continuing.";

/** True when creating another portal print request must be blocked. */
export function shouldBlockPortalPrintRequestCreate(continuableRequestCount: number): boolean {
  return continuableRequestCount > 0;
}
