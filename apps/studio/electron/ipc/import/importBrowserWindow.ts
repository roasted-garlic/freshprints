import { BrowserWindow } from "electron";

export function getActiveBrowserWindow(): BrowserWindow | null {
  const focusedWindow = BrowserWindow.getFocusedWindow();

  if (focusedWindow) {
    return focusedWindow;
  }

  const allWindows = BrowserWindow.getAllWindows();

  return allWindows[0] ?? null;
}

export function getBrowserWindowFromWebContentsId(webContentsId: number): BrowserWindow | null {
  const match = BrowserWindow.getAllWindows().find(
    (browserWindow) => browserWindow.webContents.id === webContentsId,
  );

  return match ?? null;
}
