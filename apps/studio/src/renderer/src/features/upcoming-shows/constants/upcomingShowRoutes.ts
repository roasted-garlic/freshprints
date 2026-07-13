export const UPCOMING_SHOW_ID_QUERY_PARAM = "showId";
export const UPCOMING_SHOW_REQUEST_ID_QUERY_PARAM = "requestId";

export function getUpcomingShowsPath(options?: {
  showId?: string;
  requestId?: string;
}): string {
  const showId = options?.showId?.trim();
  const requestId = options?.requestId?.trim();

  if (!showId && !requestId) {
    return "/show-queue";
  }

  const searchParams = new URLSearchParams();
  if (showId) {
    searchParams.set(UPCOMING_SHOW_ID_QUERY_PARAM, showId);
  }
  if (requestId) {
    searchParams.set(UPCOMING_SHOW_REQUEST_ID_QUERY_PARAM, requestId);
  }
  return `/show-queue?${searchParams.toString()}`;
}
