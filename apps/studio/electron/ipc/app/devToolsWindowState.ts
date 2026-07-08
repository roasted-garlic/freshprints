import { app, BrowserWindow, screen, type Rectangle, type WebContents } from "electron";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

interface SavedDevToolsWindowState {
  bounds: Rectangle;
  displayId: number;
}

const MIN_DEVTOOLS_WIDTH = 320;
const MIN_DEVTOOLS_HEIGHT = 240;

let saveDevToolsStateTimeout: ReturnType<typeof setTimeout> | null = null;

function getDevToolsWindowStatePath(): string {
  return path.join(app.getPath("userData"), "dev-tools-window-state.json");
}

function isValidDevToolsBounds(value: unknown): value is Rectangle {
  if (!value || typeof value !== "object") {
    return false;
  }

  const bounds = value as Partial<Rectangle>;

  return (
    typeof bounds.x === "number" &&
    typeof bounds.y === "number" &&
    typeof bounds.width === "number" &&
    typeof bounds.height === "number" &&
    bounds.width >= MIN_DEVTOOLS_WIDTH &&
    bounds.height >= MIN_DEVTOOLS_HEIGHT
  );
}

function isValidDevToolsWindowState(value: unknown): value is SavedDevToolsWindowState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const state = value as Partial<SavedDevToolsWindowState>;

  return isValidDevToolsBounds(state.bounds) && typeof state.displayId === "number";
}

function rectanglesIntersect(first: Rectangle, second: Rectangle): boolean {
  return (
    first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
  );
}

function getDisplayById(displayId: number) {
  return screen.getAllDisplays().find((display) => display.id === displayId);
}

function clampBoundsToWorkArea(bounds: Rectangle, workArea: Rectangle): Rectangle {
  const width = Math.min(bounds.width, workArea.width);
  const height = Math.min(bounds.height, workArea.height);
  const x = Math.max(workArea.x, Math.min(bounds.x, workArea.x + workArea.width - width));
  const y = Math.max(workArea.y, Math.min(bounds.y, workArea.y + workArea.height - height));

  return { x, y, width, height };
}

function getFallbackDevToolsBounds(): Rectangle {
  const { workArea } = screen.getPrimaryDisplay();

  return clampBoundsToWorkArea(
    {
      x: workArea.x + 48,
      y: workArea.y + 48,
      width: Math.min(1100, workArea.width - 96),
      height: Math.min(760, workArea.height - 96),
    },
    workArea,
  );
}

function loadDevToolsWindowState(): SavedDevToolsWindowState | null {
  try {
    const statePath = getDevToolsWindowStatePath();

    if (!existsSync(statePath)) {
      return null;
    }

    const parsedState: unknown = JSON.parse(readFileSync(statePath, "utf-8"));

    if (!isValidDevToolsWindowState(parsedState)) {
      return null;
    }

    return parsedState;
  } catch {
    return null;
  }
}

function saveDevToolsWindowState(devToolsWindow: BrowserWindow): void {
  if (devToolsWindow.isDestroyed()) {
    return;
  }

  const bounds = devToolsWindow.getBounds();
  const display = screen.getDisplayMatching(bounds);
  const state: SavedDevToolsWindowState = {
    bounds,
    displayId: display.id,
  };

  try {
    writeFileSync(getDevToolsWindowStatePath(), JSON.stringify(state, null, 2));
  } catch {
    // DevTools placement persistence should not block closing DevTools.
  }
}

function scheduleDevToolsWindowStateSave(devToolsWindow: BrowserWindow): void {
  if (saveDevToolsStateTimeout) {
    clearTimeout(saveDevToolsStateTimeout);
  }

  saveDevToolsStateTimeout = setTimeout(() => {
    saveDevToolsWindowState(devToolsWindow);
    saveDevToolsStateTimeout = null;
  }, 300);
}

function restoreDevToolsWindowState(devToolsWindow: BrowserWindow): void {
  const savedState = loadDevToolsWindowState();

  if (!savedState) {
    return;
  }

  const savedDisplay = getDisplayById(savedState.displayId);
  const targetDisplay = savedDisplay ?? screen.getPrimaryDisplay();
  const { workArea } = targetDisplay;

  let nextBounds = clampBoundsToWorkArea(savedState.bounds, workArea);

  if (!rectanglesIntersect(nextBounds, workArea)) {
    nextBounds = getFallbackDevToolsBounds();
  }

  devToolsWindow.setBounds(nextBounds);
}

function bindDevToolsWindowPersistence(devToolsWindow: BrowserWindow): void {
  if (devToolsWindow.isDestroyed()) {
    return;
  }

  restoreDevToolsWindowState(devToolsWindow);

  devToolsWindow.on("resize", () => scheduleDevToolsWindowStateSave(devToolsWindow));
  devToolsWindow.on("move", () => scheduleDevToolsWindowStateSave(devToolsWindow));
  devToolsWindow.on("close", () => saveDevToolsWindowState(devToolsWindow));
}

export function attachDevToolsWindowPersistence(webContents: WebContents): void {
  if (app.isPackaged) {
    return;
  }

  webContents.on("devtools-opened", () => {
    const devToolsWebContents = webContents.devToolsWebContents;

    if (!devToolsWebContents) {
      return;
    }

    const devToolsWindow = BrowserWindow.fromWebContents(devToolsWebContents);

    if (!devToolsWindow) {
      return;
    }

    bindDevToolsWindowPersistence(devToolsWindow);
  });
}

export function openDetachedDevTools(browserWindow: BrowserWindow): void {
  if (browserWindow.webContents.isDevToolsOpened()) {
    const devToolsWebContents = browserWindow.webContents.devToolsWebContents;
    const devToolsWindow = devToolsWebContents
      ? BrowserWindow.fromWebContents(devToolsWebContents)
      : null;

    if (devToolsWindow) {
      devToolsWindow.focus();
    }

    return;
  }

  browserWindow.webContents.openDevTools({ mode: "detach" });
}
