import { BrowserWindow, ipcMain, screen, type IpcMainEvent, type IpcMainInvokeEvent } from "electron";
import path from "node:path";

import type {
  FirebaseDebugCommand,
  OpenFirebaseDebugWindowRequest,
} from "@fresh-prints/shared/types/firebaseDebug/firebaseDebugIpc.types";
import type { FirestoreTraceSnapshot } from "@fresh-prints/shared/utils/firestoreUsageTrace";

import { FIREBASE_DEBUG_IPC_CHANNELS } from "./firebaseDebugIpcChannels";
import { canOpenFirebaseDebugWindow } from "./firebaseDebugWindowGate";
import { FirebaseDebugWindowLifecycle } from "./firebaseDebugWindowLifecycle";
import {
  centerDebugWindowInWorkArea,
  placeDebugWindowBesideApp,
} from "./firebaseDebugWindowBounds";

interface RegisterFirebaseDebugIpcHandlersOptions {
  getMainWindow: () => BrowserWindow | null;
  getPreloadPath: () => string;
  getRendererDist: () => string;
  getDevServerUrl: () => string | undefined;
  isPackaged: () => boolean;
}

const debugWindowLifecycle = new FirebaseDebugWindowLifecycle<BrowserWindow>();
let latestSnapshot: FirestoreTraceSnapshot | null = null;

function isMainSender(event: IpcMainEvent | IpcMainInvokeEvent, mainWindow: BrowserWindow | null) {
  return Boolean(mainWindow && !mainWindow.isDestroyed() && event.sender === mainWindow.webContents);
}

function isDebugSender(event: IpcMainEvent | IpcMainInvokeEvent) {
  const debugWindow = debugWindowLifecycle.get();
  return Boolean(debugWindow && event.sender === debugWindow.webContents);
}

function loadDebugWindow(
  window: BrowserWindow,
  options: RegisterFirebaseDebugIpcHandlersOptions,
) {
  const devServerUrl = options.getDevServerUrl();
  if (devServerUrl) {
    const url = new URL(devServerUrl);
    url.searchParams.set("firebaseDebugWindow", "1");
    return window.loadURL(url.toString());
  }
  return window.loadFile(path.join(options.getRendererDist(), "index.html"), {
    query: { firebaseDebugWindow: "1" },
  });
}

function openOrFocusDebugWindow(options: RegisterFirebaseDebugIpcHandlersOptions) {
  const result = debugWindowLifecycle.open(() => {
    const mainWindow = options.getMainWindow();
    const display = mainWindow && !mainWindow.isDestroyed()
      ? screen.getDisplayMatching(mainWindow.getBounds())
      : screen.getPrimaryDisplay();
    const bounds = mainWindow && !mainWindow.isDestroyed()
      ? placeDebugWindowBesideApp(display.workArea, mainWindow.getBounds())
      : centerDebugWindowInWorkArea(display.workArea);
    const window = new BrowserWindow({
      ...bounds,
      minWidth: 420,
      minHeight: 480,
      title: "Firebase Debug — Fresh Prints Studio",
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: options.getPreloadPath(),
      },
    });
    window.on("closed", () => debugWindowLifecycle.clear(window));
    return window;
  });
  if (result.created) void loadDebugWindow(result.window, options);
}

export function closeFirebaseDebugWindow() {
  debugWindowLifecycle.close();
}

export function registerFirebaseDebugIpcHandlers(
  options: RegisterFirebaseDebugIpcHandlersOptions,
) {
  ipcMain.handle(
    FIREBASE_DEBUG_IPC_CHANNELS.OPEN,
    (event, request: OpenFirebaseDebugWindowRequest): { opened: boolean } => {
      const allowed = canOpenFirebaseDebugWindow({
        isPackaged: options.isPackaged(),
        projectId: typeof request?.projectId === "string" ? request.projectId : "",
        isMainWindowSender: isMainSender(event, options.getMainWindow()),
      });
      if (!allowed) return { opened: false };
      openOrFocusDebugWindow(options);
      return { opened: true };
    },
  );

  ipcMain.on(FIREBASE_DEBUG_IPC_CHANNELS.PUBLISH_SNAPSHOT, (event, snapshot) => {
    if (!isMainSender(event, options.getMainWindow())) return;
    latestSnapshot = snapshot as FirestoreTraceSnapshot;
    const debugWindow = debugWindowLifecycle.get();
    if (debugWindow) {
      debugWindow.webContents.send(FIREBASE_DEBUG_IPC_CHANNELS.SNAPSHOT, latestSnapshot);
    }
  });

  ipcMain.handle(FIREBASE_DEBUG_IPC_CHANNELS.GET_SNAPSHOT, (event) =>
    isDebugSender(event) ? latestSnapshot : null,
  );

  ipcMain.on(FIREBASE_DEBUG_IPC_CHANNELS.COMMAND, (event, command: FirebaseDebugCommand) => {
    if (!isDebugSender(event)) return;
    const mainWindow = options.getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(FIREBASE_DEBUG_IPC_CHANNELS.COMMAND, command);
    }
  });

  ipcMain.on(FIREBASE_DEBUG_IPC_CHANNELS.CLOSE, (event) => {
    if (isDebugSender(event)) closeFirebaseDebugWindow();
  });
}
