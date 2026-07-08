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
