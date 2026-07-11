/**
 * Portal customers may have at most one continuable (`draft` / `editing`) print request.
 * Used by create callable and client create gates.
 */
export const PORTAL_ONE_WORKING_REQUEST_MESSAGE =
  "You already have a request in progress. Finish editing it or add it to a show before starting a new one.";

/** True when creating another portal print request must be blocked. */
export function shouldBlockPortalPrintRequestCreate(continuableRequestCount: number): boolean {
  return continuableRequestCount > 0;
}
