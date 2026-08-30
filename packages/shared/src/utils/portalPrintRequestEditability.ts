import type { PrintRequest } from "../types/printRequest/printRequest.types";
import type { PrintRequestStatus } from "../types/printRequest/printRequest.enums";

import { isPortalContinuablePrintRequestStatus } from "./portalPrintRequestListTabs";

export type PortalPrintRequestEditabilityFields = Pick<
  PrintRequest,
  "status" | "requestOrigin" | "isInternal"
>;

/** Portal item callables only mutate customer requests created in Portal. */
export function isPortalCustomerOriginPrintRequest(
  request: Pick<PrintRequest, "requestOrigin" | "isInternal">,
): boolean {
  return request.requestOrigin === "portal_customer" && request.isInternal !== true;
}

/**
 * Authoritative Portal editability contract — UI selection, qty controls, and callable
 * validation must agree on this predicate.
 */
export function isPortalEditablePrintRequest(
  request: PortalPrintRequestEditabilityFields,
): boolean {
  return (
    isPortalContinuablePrintRequestStatus(request.status) &&
    isPortalCustomerOriginPrintRequest(request)
  );
}

export function filterPortalEditableContinuablePrintRequests(
  requests: PrintRequest[],
): PrintRequest[] {
  return requests.filter(isPortalEditablePrintRequest);
}

export function filterLegacyContinuablePrintRequests(requests: PrintRequest[]): PrintRequest[] {
  return requests.filter(
    (request) =>
      isPortalContinuablePrintRequestStatus(request.status) &&
      !isPortalCustomerOriginPrintRequest(request),
  );
}

export function sortPrintRequestsByUpdatedAtDesc(requests: PrintRequest[]): PrintRequest[] {
  return [...requests].sort((left, right) => {
    const leftMs = left.updatedAt?.toMillis?.() ?? 0;
    const rightMs = right.updatedAt?.toMillis?.() ?? 0;
    return rightMs - leftMs;
  });
}

export function selectPortalWorkingPrintRequest(
  portalEditableContinuableRequests: PrintRequest[],
  selectedWorkingRequestId: string | null,
): PrintRequest | null {
  const sorted = sortPrintRequestsByUpdatedAtDesc(portalEditableContinuableRequests);

  if (selectedWorkingRequestId) {
    const selected = sorted.find((request) => request.id === selectedWorkingRequestId);
    if (selected) {
      return selected;
    }
  }

  return sorted[0] ?? null;
}

export function countPortalEditableContinuableRequests(requests: PrintRequest[]): number {
  return filterPortalEditableContinuablePrintRequests(requests).length;
}

export function explainPortalPrintRequestEditability(
  request: PortalPrintRequestEditabilityFields,
): string {
  if (request.isInternal === true) {
    return "Internal requests cannot be edited in the Portal.";
  }

  if (request.requestOrigin === "studio_customer") {
    return "This request was created in Studio and cannot be edited from the Portal.";
  }

  if (request.requestOrigin === "studio_internal") {
    return "This request is internal and cannot be edited from the Portal.";
  }

  if (!isPortalContinuablePrintRequestStatus(request.status as PrintRequestStatus)) {
    return "This print request can no longer be edited.";
  }

  if (request.requestOrigin !== "portal_customer") {
    return "This request cannot be edited from the Portal.";
  }

  return "This request cannot be edited from the Portal.";
}
