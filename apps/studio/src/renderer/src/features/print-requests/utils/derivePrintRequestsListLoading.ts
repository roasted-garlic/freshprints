import type { PrintRequestListTab } from "@fresh-prints/shared/utils/printRequestListGrouping";

/**
 * Derives whether `usePrintRequests`'s consumers should treat the list as still loading. `loadFirstPage`
 * resets `state`/`isLoading` for a new `activeTab` inside a `useEffect`, which React only runs AFTER
 * the render where `activeTab` changed has already committed and painted — so `state.isLoading` alone
 * can read `false` for one or more renders while `state.requests` still holds the PREVIOUS tab's page.
 * Comparing `loadedTab` (the tab the hook's `state` actually reflects, updated only when a load
 * completes) against the live `activeTab` closes that gap: the derived value stays `true` for every
 * render where they disagree, exactly matching the window `state.requests` can be stale for.
 */
export function derivePrintRequestsListLoading(
  stateIsLoading: boolean,
  loadedTab: PrintRequestListTab | null,
  activeTab: PrintRequestListTab,
): boolean {
  return stateIsLoading || loadedTab !== activeTab;
}
