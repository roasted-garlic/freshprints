/**
 * Pure decision for usePrintRequestDetail.reload(): whether the item array a reload fetch just
 * resolved with should actually be applied to `items` state.
 *
 * Root Cause 1 (Plan Section 20.1/20.4): while viewing the current working request,
 * `workingItems` (PortalPrintRequestContext's single owner of working-request item state) is
 * the source of truth for `items` — a `reload()` fetch (which can be stale by up to the 30s
 * read-cache TTL even after the cache-invalidation fix, and can race the `workingItems` sync
 * effect regardless of caching) must never be allowed to win against it. `reload()`'s
 * `printRequest`/`designSummaries`/`uploadSummaries` fetch is unaffected by this gate — only the
 * item array is gated.
 *
 * The check must be evaluated at *apply time* (after the async fetch resolves), not at
 * call-start time, because `isViewingWorkingRequest` can change while the fetch is in flight —
 * e.g. the fetch started while viewing a historical request, then the user queued/navigated so
 * the same request became (or stopped being) the working request before the fetch resolved.
 */
export function shouldApplyReloadedItems(params: {
  /** Whether the printRequestId being reloaded is the working request, evaluated at apply time. */
  isViewingWorkingRequestAtApplyTime: boolean;
}): boolean {
  // reload()'s item fetch is only authoritative for historical/non-working requests. While
  // viewing the working request, workingItems (synced via the cartSignature effect) owns items.
  return !params.isViewingWorkingRequestAtApplyTime;
}
