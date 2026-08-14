/** Minimum window size when not maximized. Adjust after using the viewport debug overlay (Ctrl+Shift+V). */
export const STUDIO_MIN_WINDOW_WIDTH = 1656;
export const STUDIO_MIN_WINDOW_HEIGHT = 1032;

const ABSOLUTE_MIN_WINDOW_WIDTH = 640;
const ABSOLUTE_MIN_WINDOW_HEIGHT = 480;

export const STUDIO_ABSOLUTE_MIN_WINDOW_WIDTH = ABSOLUTE_MIN_WINDOW_WIDTH;
export const STUDIO_ABSOLUTE_MIN_WINDOW_HEIGHT = ABSOLUTE_MIN_WINDOW_HEIGHT;

export interface StudioWindowSize {
  height: number;
  width: number;
}

export function isValidSavedWindowBounds(size: StudioWindowSize): boolean {
  return (
    Number.isFinite(size.width) &&
    Number.isFinite(size.height) &&
    size.width >= STUDIO_MIN_WINDOW_WIDTH &&
    size.height >= STUDIO_MIN_WINDOW_HEIGHT
  );
}

export function isValidMinimumWindowSizeRequest(size: StudioWindowSize): boolean {
  return (
    Number.isFinite(size.width) &&
    Number.isFinite(size.height) &&
    size.width >= ABSOLUTE_MIN_WINDOW_WIDTH &&
    size.height >= ABSOLUTE_MIN_WINDOW_HEIGHT
  );
}
