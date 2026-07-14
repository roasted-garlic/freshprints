import type { PrintRequestListTab } from "./printRequestListGrouping";

/**
 * Resolves what the selected Print Request id should be for a given tab's visible request ids,
 * so the detail panel never keeps showing a request that no longer belongs to the active tab.
 * Returns the current selection unchanged if it's still present in the tab; otherwise returns the
 * tab's first request id, or `null` if the tab is empty.
 */
export function resolveSelectedRequestIdForTab(
  currentSelectedRequestId: string | null,
  visibleRequestIds: string[],
): string | null {
  if (currentSelectedRequestId !== null && visibleRequestIds.includes(currentSelectedRequestId)) {
    return currentSelectedRequestId;
  }

  return visibleRequestIds[0] ?? null;
}

/**
 * Finds which Print Requests list tab currently contains `requestId`, if any.
 * Used to follow a selected request when allocations move it (e.g. Working → Queued).
 */
export function findPrintRequestListTabForRequestId(
  requestId: string | null | undefined,
  requestsByListTab: Record<PrintRequestListTab, readonly { id: string }[]>,
): PrintRequestListTab | null {
  if (!requestId?.trim()) {
    return null;
  }

  const tabs = Object.keys(requestsByListTab) as PrintRequestListTab[];
  return tabs.find((tab) => requestsByListTab[tab].some((request) => request.id === requestId)) ?? null;
}
