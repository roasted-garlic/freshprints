/**
 * Pure Previous/Next math for collection image lightboxes.
 * No wraparound (V1). Callers supply already-filtered, loaded, previewable ordered IDs.
 */

export interface PreviewLightboxNavigationState {
  /** 0-based index of activeItemId within itemIds, or -1 if missing. */
  activeIndex: number;
  /** 1-based position for UI (`n / total`), or null when active id is missing. */
  position: number | null;
  total: number;
  previousId: string | null;
  nextId: string | null;
  canGoPrevious: boolean;
  canGoNext: boolean;
  /** Subtle indicator text when total > 1 and active id is present. */
  positionLabel: string | null;
}

/**
 * Resolve navigation state for an ordered list of stable previewable item ids.
 * Missing active id → safe empty nav (no wrap, both directions disabled).
 */
export function getPreviewLightboxNavigationState(
  itemIds: readonly string[],
  activeItemId: string | null | undefined,
): PreviewLightboxNavigationState {
  const total = itemIds.length;

  if (!activeItemId || total === 0) {
    return {
      activeIndex: -1,
      position: null,
      total,
      previousId: null,
      nextId: null,
      canGoPrevious: false,
      canGoNext: false,
      positionLabel: null,
    };
  }

  const activeIndex = itemIds.indexOf(activeItemId);

  if (activeIndex < 0) {
    return {
      activeIndex: -1,
      position: null,
      total,
      previousId: null,
      nextId: null,
      canGoPrevious: false,
      canGoNext: false,
      positionLabel: null,
    };
  }

  const canGoPrevious = activeIndex > 0;
  const canGoNext = activeIndex < total - 1;
  const position = activeIndex + 1;

  return {
    activeIndex,
    position,
    total,
    previousId: canGoPrevious ? itemIds[activeIndex - 1]! : null,
    nextId: canGoNext ? itemIds[activeIndex + 1]! : null,
    canGoPrevious,
    canGoNext,
    positionLabel: total > 1 ? `${position} / ${total}` : null,
  };
}

/**
 * Keep only ids whose corresponding item is previewable (caller decides previewability).
 */
export function filterPreviewableItemIds<T>(
  items: readonly T[],
  getId: (item: T) => string,
  isPreviewable: (item: T) => boolean,
): string[] {
  const ids: string[] = [];
  for (const item of items) {
    if (isPreviewable(item)) {
      ids.push(getId(item));
    }
  }
  return ids;
}

/**
 * Resolve when an image URL is decoded enough to paint. Used so lightbox mat color and
 * artwork swap together after Previous/Next (avoids background flashing ahead of the image).
 */
export function preloadImageUrl(url: string): Promise<void> {
  if (typeof Image === "undefined") {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const image = new Image();
    const finish = () => resolve();
    image.onload = finish;
    image.onerror = finish;
    image.src = url;
    if (image.complete) {
      finish();
    }
  });
}

/**
 * True when keyboard event target is an editable control where arrow keys must not navigate.
 */
export function isPreviewLightboxEditableKeyboardTarget(
  target: EventTarget | null,
): boolean {
  if (typeof Element === "undefined" || !(target instanceof Element)) {
    return false;
  }

  const element = target.closest(
    "input, textarea, select, [contenteditable=''], [contenteditable='true'], [role='textbox'], [role='spinbutton']",
  );

  if (!element) {
    return false;
  }

  if (typeof HTMLInputElement !== "undefined" && element instanceof HTMLInputElement) {
    const type = element.type.toLowerCase();
    if (
      type === "button" ||
      type === "checkbox" ||
      type === "radio" ||
      type === "submit" ||
      type === "reset" ||
      type === "file" ||
      type === "image" ||
      type === "hidden" ||
      type === "color" ||
      type === "range"
    ) {
      return false;
    }
  }

  return true;
}
