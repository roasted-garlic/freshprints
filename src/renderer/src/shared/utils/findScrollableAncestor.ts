/**
 * Nearest ancestor that actually clips overflow (e.g. a modal's scrollable body), if any. Modals
 * commonly set `overflow-y: auto` on the body so their own content scrolls independently of the
 * window — measuring available space against `window.innerHeight` in that case ignores the
 * modal's own boundary and lets a popover/dropdown render as if the whole browser viewport were
 * available, even though the modal will clip it well before that.
 */
export function findScrollableAncestor(element: HTMLElement | null): HTMLElement | null {
  let current = element?.parentElement ?? null;

  while (current) {
    const style = window.getComputedStyle(current);

    if (
      (style.overflowY === "auto" || style.overflowY === "scroll") &&
      current.scrollHeight > current.clientHeight
    ) {
      return current;
    }

    current = current.parentElement;
  }

  return null;
}
