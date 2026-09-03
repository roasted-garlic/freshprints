import type { PrintRequest } from "../types/printRequest/printRequest.types";

import {
  isPortalEditablePrintRequest,
  sortPrintRequestsByUpdatedAtDesc,
  type PortalPrintRequestEditabilityFields,
} from "./portalPrintRequestEditability";

export const PORTAL_PARKED_DRAFT_INACTIVE_MESSAGE =
  "This request is temporarily inactive while you finish editing another request.";

export const PORTAL_PARKED_DRAFT_MUTATION_REJECTED_MESSAGE =
  "This request is temporarily inactive while you finish editing another request.";

export const PORTAL_EDITING_MODE_BANNER_WITH_PARKED_DRAFT =
  "You're updating a request that was removed from a show. Your previous Current Request is saved and temporarily locked until you are done with this one. Add this request back to a show when you're finished to return to your Current Request.";

export const PORTAL_EDITING_MODE_BANNER_WITHOUT_PARKED_DRAFT =
  "You're updating a request that was removed from a show. Finish your changes and add it back to a show when you're ready.";

export const PORTAL_PARKED_DRAFT_OVERLAY_TITLE = "This request is temporarily inactive";

export const PORTAL_PARKED_DRAFT_OVERLAY_BODY =
  "You're currently editing another request that was previously submitted to a show.";

export const PORTAL_PARKED_DRAFT_OVERLAY_CTA = "Go to Editing Request";

/**
 * Checks if a print request is a parked draft.
 * Parked drafts are status=draft with a non-empty parkedByEditingRequestId.
 */
export function isPortalParkedDraft(
  request: Pick<PrintRequest, "status" | "parkedByEditingRequestId">,
): boolean {
  return request.status === "draft" && Boolean(request.parkedByEditingRequestId?.trim());
}

/**
 * Authoritative Portal active editability contract — UI selection, qty controls, and callable
 * validation must agree on this predicate. Excludes parked drafts.
 */
export function isPortalActiveEditablePrintRequest(
  request: PortalPrintRequestEditabilityFields & Pick<PrintRequest, "parkedByEditingRequestId">,
): boolean {
  return (
    isPortalEditablePrintRequest(request) &&
    !isPortalParkedDraft({ status: request.status, parkedByEditingRequestId: request.parkedByEditingRequestId })
  );
}

export function filterPortalActiveEditablePrintRequests(
  requests: PrintRequest[],
): PrintRequest[] {
  return requests.filter(isPortalActiveEditablePrintRequest);
}

export function filterPortalParkedDrafts(
  requests: PrintRequest[],
): PrintRequest[] {
  return requests.filter(isPortalParkedDraft);
}

/**
 * Selects the Portal working request, preferring status=editing over unparked drafts.
 * Uses the same sorting and selection logic as selectPortalWorkingPrintRequest
 * but filters to only active (non-parked) requests.
 */
export function selectPortalActiveEditablePrintRequest(
  portalEditableRequests: PrintRequest[],
  selectedWorkingRequestId: string | null,
): PrintRequest | null {
  const activeRequests = filterPortalActiveEditablePrintRequests(portalEditableRequests);
  const sorted = sortPrintRequestsByUpdatedAtDesc(activeRequests);

  // Prefer editing status over drafts
  const editingRequests = sorted.filter((request) => request.status === "editing");
  const draftRequests = sorted.filter((request) => request.status === "draft");
  const prioritizedSorted = [...editingRequests, ...draftRequests];

  if (selectedWorkingRequestId) {
    const selected = prioritizedSorted.find((request) => request.id === selectedWorkingRequestId);
    if (selected) {
      return selected;
    }
  }

  return prioritizedSorted[0] ?? null;
}

export function countPortalActiveEditablePrintRequests(requests: PrintRequest[]): number {
  return filterPortalActiveEditablePrintRequests(requests).length;
}