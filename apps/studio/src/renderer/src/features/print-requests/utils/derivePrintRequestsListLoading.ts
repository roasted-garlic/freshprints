import type { PrintRequestListTab } from "@fresh-prints/shared/utils/printRequestListGrouping";

import type { PrintRequestListKind } from "../constants/printRequestRoutes";

export type PrintRequestsLoadedKind = PrintRequestListKind | "all";

/**
 * Derives whether `usePrintRequests`'s consumers should treat the list as still loading. `loadFirstPage`
 * resets `state`/`isLoading` for a new `activeTab` / kind inside a `useEffect`, which React only runs AFTER
 * the render where those values changed has already committed and painted — so `state.isLoading` alone
 * can read `false` for one or more renders while `state.requests` still holds the PREVIOUS tab or kind's page.
 * Comparing `loadedTab` / `loadedKind` (the tab and kind the hook's `state` actually reflects, updated only
 * when a load completes) against the live values closes that gap: the derived value stays `true` for every
 * render where they disagree, exactly matching the window `state.requests` can be stale for.
 */
export function derivePrintRequestsListLoading(
  stateIsLoading: boolean,
  loadedTab: PrintRequestListTab | null,
  activeTab: PrintRequestListTab,
  loadedKind: PrintRequestsLoadedKind | null,
  activeKind: PrintRequestsLoadedKind,
): boolean {
  return stateIsLoading || loadedTab !== activeTab || loadedKind !== activeKind;
}
