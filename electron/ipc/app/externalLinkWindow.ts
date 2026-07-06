import { BrowserWindow, screen, type Rectangle } from "electron";

import { isSafeExternalLinkUrl } from "../../../shared/utils/externalLinkSafety";

const MIN_EXTERNAL_LINK_WIDTH = 480;
const MIN_EXTERNAL_LINK_HEIGHT = 360;

function clampBoundsToWorkArea(bounds: Rectangle, workArea: Rectangle): Rectangle {
  const width = Math.min(bounds.width, workArea.width);
  const height = Math.min(bounds.height, workArea.height);
  const x = Math.max(workArea.x, Math.min(bounds.x, workArea.x + workArea.width - width));
  const y = Math.max(workArea.y, Math.min(bounds.y, workArea.y + workArea.height - height));

  return { x, y, width, height };
}

function getExternalLinkBoundsOnDisplay(workArea: Rectangle): Rectangle {
  const width = Math.max(MIN_EXTERNAL_LINK_WIDTH, Math.min(1200, workArea.width - 96));
  const height = Math.max(MIN_EXTERNAL_LINK_HEIGHT, Math.min(840, workArea.height - 96));

  return clampBoundsToWorkArea(
    {
      x: Math.round(workArea.x + (workArea.width - width) / 2),
      y: Math.round(workArea.y + (workArea.height - height) / 2),
      width,
      height,
    },
    workArea,
  );
}

/**
 * Opens an http(s) URL in a plain (non-preload, no node integration) BrowserWindow positioned on
 * the same display as the given owner window. Electron's `shell.openExternal` hands off to the
 * OS default browser, whose window placement cannot be influenced by the app — this in-app window
 * is the only way to guarantee same-monitor placement, at the cost of not being the user's actual
 * default browser (no extensions/saved logins from their normal browsing profile).
 */
export function openExternalLinkOnSameDisplay(rawUrl: string, ownerWindow: BrowserWindow | null): boolean {
  if (!isSafeExternalLinkUrl(rawUrl)) {
    return false;
  }

  const referenceBounds = ownerWindow && !ownerWindow.isDestroyed() ? ownerWindow.getBounds() : undefined;
  const targetDisplay = referenceBounds
    ? screen.getDisplayMatching(referenceBounds)
    : screen.getPrimaryDisplay();

  const linkWindow = new BrowserWindow({
    ...getExternalLinkBoundsOnDisplay(targetDisplay.workArea),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  void linkWindow.loadURL(rawUrl);

  return true;
}
