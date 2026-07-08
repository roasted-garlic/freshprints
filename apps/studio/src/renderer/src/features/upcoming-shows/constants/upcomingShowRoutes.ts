export const UPCOMING_SHOW_ID_QUERY_PARAM = "showId";

export function getUpcomingShowsPath(options?: { showId?: string }): string {
  const showId = options?.showId?.trim();

  if (!showId) {
    return "/show-queue";
  }

  const searchParams = new URLSearchParams();
  searchParams.set(UPCOMING_SHOW_ID_QUERY_PARAM, showId);
  return `/show-queue?${searchParams.toString()}`;
}
