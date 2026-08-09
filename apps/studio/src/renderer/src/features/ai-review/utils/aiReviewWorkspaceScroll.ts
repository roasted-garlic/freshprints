/**
 * Scroll the AI Review page content area (the element that owns vertical scrolling)
 * back to the top so the next design's preview is visible after approve/reject/archive.
 *
 * Studio AppShell applies `overflow-y: auto` on `.page-content-area--ai-review`.
 * Do not use `window.scrollTo` — the window is not the scroll owner.
 */
export function scrollAiReviewPageContentToTop(
  fromElement?: HTMLElement | null,
): { scrolled: boolean; containerClassName: string | null } {
  const preferred =
    (fromElement?.closest(".page-content-area--ai-review") as HTMLElement | null) ??
    (document.querySelector(".page-content-area--ai-review") as HTMLElement | null);

  if (preferred) {
    preferred.scrollTop = 0;
    return { scrolled: true, containerClassName: "page-content-area--ai-review" };
  }

  let current: HTMLElement | null = fromElement ?? null;
  while (current) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    if (
      (overflowY === "auto" || overflowY === "scroll") &&
      current.scrollHeight > current.clientHeight + 1
    ) {
      current.scrollTop = 0;
      return { scrolled: true, containerClassName: current.className || null };
    }
    current = current.parentElement;
  }

  return { scrolled: false, containerClassName: null };
}
