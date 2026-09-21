/** How many inbox alerts each tab/section shows before Load More. */
export const STAFF_INBOX_VISIBLE_PAGE_SIZE = 10;

export function initialVisibleCount(pageSize = STAFF_INBOX_VISIBLE_PAGE_SIZE): number {
  return pageSize;
}

export function clampVisibleCount(
  current: number,
  total: number,
  pageSize = STAFF_INBOX_VISIBLE_PAGE_SIZE,
): number {
  if (total <= 0) {
    return pageSize;
  }
  if (current < pageSize) {
    return Math.min(pageSize, total);
  }
  return Math.min(current, total);
}

export function advanceVisibleCount(
  current: number,
  total: number,
  pageSize = STAFF_INBOX_VISIBLE_PAGE_SIZE,
): number {
  if (total <= 0) {
    return pageSize;
  }
  return Math.min(total, current + pageSize);
}

export function canRevealMoreVisible(visibleCount: number, total: number): boolean {
  return visibleCount < total;
}
