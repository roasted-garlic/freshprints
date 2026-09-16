import type { PrintRequestOrigin } from "../types/printRequest/printRequest.types";

/**
 * Customer show-management authority is intentionally narrower than Portal content editability.
 * Ownership and lifecycle validation remain server-side callable responsibilities.
 */
export function isPortalShowManagementEligiblePrintRequest(
  request: {
    requestOrigin?: PrintRequestOrigin;
    isInternal?: boolean;
  },
): boolean {
  const origin = request.requestOrigin as PrintRequestOrigin | undefined;

  return (
    request.isInternal !== true &&
    (origin === "portal_customer" || origin === "studio_customer")
  );
}
