import type { BrowserWindow } from "electron";

import {
  STUDIO_ABSOLUTE_MIN_WINDOW_HEIGHT,
  STUDIO_ABSOLUTE_MIN_WINDOW_WIDTH,
  STUDIO_MIN_WINDOW_HEIGHT,
  STUDIO_MIN_WINDOW_WIDTH,
  isValidMinimumWindowSizeRequest,
} from "../../window/studioWindowConstraints";

let runtimeMinWidth = STUDIO_MIN_WINDOW_WIDTH;
let runtimeMinHeight = STUDIO_MIN_WINDOW_HEIGHT;

export function applyStudioWindowMinimumSize(browserWindow: BrowserWindow): void {
  browserWindow.setMinimumSize(runtimeMinWidth, runtimeMinHeight);
}

export function getStudioWindowMinimumSize(): { minHeight: number; minWidth: number } {
  return {
    minWidth: runtimeMinWidth,
    minHeight: runtimeMinHeight,
  };
}

export function setStudioWindowMinimumSize(width: number, height: number): { minHeight: number; minWidth: number } {
  if (!isValidMinimumWindowSizeRequest({ width, height })) {
    throw new Error("Minimum window size is invalid.");
  }

  runtimeMinWidth = Math.round(width);
  runtimeMinHeight = Math.round(height);

  return getStudioWindowMinimumSize();
}

export function resetStudioWindowMinimumSizeToDefault(): { minHeight: number; minWidth: number } {
  runtimeMinWidth = STUDIO_MIN_WINDOW_WIDTH;
  runtimeMinHeight = STUDIO_MIN_WINDOW_HEIGHT;

  return getStudioWindowMinimumSize();
}

export function unlockStudioWindowMinimumSize(): { minHeight: number; minWidth: number } {
  runtimeMinWidth = STUDIO_ABSOLUTE_MIN_WINDOW_WIDTH;
  runtimeMinHeight = STUDIO_ABSOLUTE_MIN_WINDOW_HEIGHT;

  return getStudioWindowMinimumSize();
}

export function readWindowMetrics(browserWindow: BrowserWindow) {
  const [windowWidth, windowHeight] = browserWindow.getSize();
  const [contentWidth, contentHeight] = browserWindow.getContentSize();
  const { minWidth, minHeight } = getStudioWindowMinimumSize();

  return {
    windowWidth,
    windowHeight,
    contentWidth,
    contentHeight,
    isMaximized: browserWindow.isMaximized(),
    minWidth,
    minHeight,
  };
}
