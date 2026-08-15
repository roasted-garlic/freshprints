export const UPCOMING_SHOW_ID_QUERY_PARAM = "showId";
export const UPCOMING_SHOW_REQUEST_ID_QUERY_PARAM = "requestId";

export type ShowQueueRouteSurface = "shows" | "staff_gang_sheets";

function buildShowQueueSearch(options?: {
  showId?: string;
  requestId?: string;
}): string {
  const showId = options?.showId?.trim();
  const requestId = options?.requestId?.trim();

  if (!showId && !requestId) {
    return "";
  }

  const searchParams = new URLSearchParams();
  if (showId) {
    searchParams.set(UPCOMING_SHOW_ID_QUERY_PARAM, showId);
  }
  if (requestId) {
    searchParams.set(UPCOMING_SHOW_REQUEST_ID_QUERY_PARAM, requestId);
  }
  return `?${searchParams.toString()}`;
}

export function getUpcomingShowsPath(options?: {
  showId?: string;
  requestId?: string;
}): string {
  return `/show-queue${buildShowQueueSearch(options)}`;
}

export function getInternalGangSheetsPath(options?: {
  showId?: string;
  requestId?: string;
}): string {
  return `/internal-gang-sheets${buildShowQueueSearch(options)}`;
}

export function getShowQueueSurfacePath(
  surface: ShowQueueRouteSurface,
  options?: { showId?: string; requestId?: string },
): string {
  return surface === "staff_gang_sheets"
    ? getInternalGangSheetsPath(options)
    : getUpcomingShowsPath(options);
}
