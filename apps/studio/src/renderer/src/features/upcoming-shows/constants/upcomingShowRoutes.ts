import type { WhatnotShowQueueTab } from "@fresh-prints/shared/utils/showProductionRecovery";

export const UPCOMING_SHOW_ID_QUERY_PARAM = "showId";
export const UPCOMING_SHOW_REQUEST_ID_QUERY_PARAM = "requestId";
export const SHOW_QUEUE_TAB_QUERY_PARAM = "tab";

export const WHATNOT_SHOW_QUEUE_LIST_TABS = ["upcoming", "needs_attention", "past"] as const;
export const STAFF_GANG_SHEET_LIST_TABS = ["current", "history"] as const;

export type StaffGangSheetListTab = (typeof STAFF_GANG_SHEET_LIST_TABS)[number];

export type ShowQueueRouteSurface = "shows" | "staff_gang_sheets";

export interface ShowQueueRouteOptions {
  showId?: string;
  requestId?: string;
  tab?: WhatnotShowQueueTab | StaffGangSheetListTab;
}

export function isWhatnotShowQueueListTab(value: string | null): value is WhatnotShowQueueTab {
  return WHATNOT_SHOW_QUEUE_LIST_TABS.includes(value as WhatnotShowQueueTab);
}

export function isStaffGangSheetListTab(value: string | null): value is StaffGangSheetListTab {
  return STAFF_GANG_SHEET_LIST_TABS.includes(value as StaffGangSheetListTab);
}

export function resolveWhatnotShowQueueListTab(tabParam: string | null): WhatnotShowQueueTab {
  return isWhatnotShowQueueListTab(tabParam) ? tabParam : "upcoming";
}

export function resolveStaffGangSheetListTab(tabParam: string | null): StaffGangSheetListTab {
  return isStaffGangSheetListTab(tabParam) ? tabParam : "current";
}

export function resolveShowQueueListTabForSurface(
  surface: ShowQueueRouteSurface,
  tabParam: string | null,
): WhatnotShowQueueTab | StaffGangSheetListTab {
  return surface === "staff_gang_sheets"
    ? resolveStaffGangSheetListTab(tabParam)
    : resolveWhatnotShowQueueListTab(tabParam);
}

function buildShowQueueSearchParams(options?: ShowQueueRouteOptions): URLSearchParams {
  const searchParams = new URLSearchParams();
  const showId = options?.showId?.trim();
  const requestId = options?.requestId?.trim();
  const tab = options?.tab;

  if (tab) {
    searchParams.set(SHOW_QUEUE_TAB_QUERY_PARAM, tab);
  }
  if (showId) {
    searchParams.set(UPCOMING_SHOW_ID_QUERY_PARAM, showId);
  }
  if (requestId) {
    searchParams.set(UPCOMING_SHOW_REQUEST_ID_QUERY_PARAM, requestId);
  }
  return searchParams;
}

function buildShowQueueSearch(options?: ShowQueueRouteOptions): string {
  const searchParams = buildShowQueueSearchParams(options);
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export function getUpcomingShowsPath(options?: ShowQueueRouteOptions): string {
  return `/show-queue${buildShowQueueSearch(options)}`;
}

export function getInternalGangSheetsPath(options?: ShowQueueRouteOptions): string {
  return `/internal-gang-sheets${buildShowQueueSearch(options)}`;
}

export function getShowQueueSurfacePath(
  surface: ShowQueueRouteSurface,
  options?: ShowQueueRouteOptions,
): string {
  return surface === "staff_gang_sheets"
    ? getInternalGangSheetsPath(options)
    : getUpcomingShowsPath(options);
}

export function buildShowQueueRouteSearchParams(
  options: ShowQueueRouteOptions,
): URLSearchParams {
  return buildShowQueueSearchParams(options);
}

export function shouldReplaceShowQueuePath(
  current: {
    showId: string | null;
    requestId: string | null;
    tab: string | null;
  },
  next: ShowQueueRouteOptions,
): boolean {
  return (
    current.tab !== (next.tab ?? null) ||
    current.showId !== (next.showId?.trim() || null) ||
    current.requestId !== (next.requestId?.trim() || null)
  );
}
