import { app, BrowserWindow, Menu, screen, type BrowserWindowConstructorOptions, type Rectangle } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { suppressDevToolsAutofillConsoleNoise } from './dev/suppressDevToolsAutofillConsoleNoise'
import { registerAppIpcHandlers } from './ipc/app/appIpcHandlers'
import { APP_CONFIRM_CLOSE_REQUESTED } from './ipc/app/appIpcChannels'
import { attachDevToolsWindowPersistence } from './ipc/app/devToolsWindowState'
import { consumeCloseConfirmation, getUploadActive } from './ipc/app/uploadActivityState'
import { registerExportIpcHandlers } from './ipc/export/exportIpcHandlers'
import { registerImportIpcHandlers } from './ipc/import/importIpcHandlers'
import { registerWhatnotImportIpcHandlers } from './ipc/whatnotImport/whatnotImportIpcHandlers'
import { attachTextInputContextMenu } from './services/app/textInputContextMenu'
import { runDevDerivativeGenerationVerification } from './services/import/verifyDerivativeGenerationInMainProcess'

suppressDevToolsAutofillConsoleNoise()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appName = 'Fresh Prints Desktop'
const appIconFileName = 'fresh-prints-logo.svg'

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null
let saveWindowStateTimeout: ReturnType<typeof setTimeout> | null = null

interface SavedWindowState {
  bounds: Rectangle
  isMaximized: boolean
}

function getWindowStatePath() {
  return path.join(app.getPath('userData'), 'window-state.json')
}

function isValidWindowBounds(value: unknown): value is Rectangle {
  if (!value || typeof value !== 'object') {
    return false
  }

  const bounds = value as Partial<Rectangle>

  return (
    typeof bounds.x === 'number' &&
    typeof bounds.y === 'number' &&
    typeof bounds.width === 'number' &&
    typeof bounds.height === 'number' &&
    bounds.width >= 640 &&
    bounds.height >= 480
  )
}

function isValidWindowState(value: unknown): value is SavedWindowState {
  if (!value || typeof value !== 'object') {
    return false
  }

  const state = value as Partial<SavedWindowState>

  return isValidWindowBounds(state.bounds) && typeof state.isMaximized === 'boolean'
}

function rectanglesIntersect(first: Rectangle, second: Rectangle) {
  return (
    first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
  )
}

function isVisibleOnAnyDisplay(bounds: Rectangle) {
  return screen.getAllDisplays().some((display) => rectanglesIntersect(bounds, display.workArea))
}

function getCenteredPrimaryDisplayBounds(): Rectangle {
  const { workArea } = screen.getPrimaryDisplay()
  const width = Math.min(1280, workArea.width)
  const height = Math.min(800, workArea.height)

  return {
    x: Math.round(workArea.x + (workArea.width - width) / 2),
    y: Math.round(workArea.y + (workArea.height - height) / 2),
    width,
    height,
  }
}

function loadWindowState(): SavedWindowState {
  const fallbackState: SavedWindowState = {
    bounds: getCenteredPrimaryDisplayBounds(),
    isMaximized: false,
  }

  try {
    const windowStatePath = getWindowStatePath()

    if (!existsSync(windowStatePath)) {
      return fallbackState
    }

    const parsedState: unknown = JSON.parse(readFileSync(windowStatePath, 'utf-8'))

    if (!isValidWindowState(parsedState) || !isVisibleOnAnyDisplay(parsedState.bounds)) {
      return fallbackState
    }

    return parsedState
  } catch {
    return fallbackState
  }
}

function saveWindowState(browserWindow: BrowserWindow) {
  if (browserWindow.isDestroyed()) {
    return
  }

  const windowState: SavedWindowState = {
    bounds: browserWindow.getNormalBounds(),
    isMaximized: browserWindow.isMaximized(),
  }

  try {
    writeFileSync(getWindowStatePath(), JSON.stringify(windowState, null, 2))
  } catch {
    // Window placement persistence should not prevent the app from closing.
  }
}

function scheduleWindowStateSave(browserWindow: BrowserWindow) {
  if (saveWindowStateTimeout) {
    clearTimeout(saveWindowStateTimeout)
  }

  saveWindowStateTimeout = setTimeout(() => {
    saveWindowState(browserWindow)
    saveWindowStateTimeout = null
  }, 300)
}

function createWindow() {
  const savedWindowState = loadWindowState()
  const windowOptions: BrowserWindowConstructorOptions = {
    ...savedWindowState.bounds,
    icon: path.join(process.env.VITE_PUBLIC ?? RENDERER_DIST, appIconFileName),
    title: appName,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.mjs'),
    },
  }

  win = new BrowserWindow({
    ...windowOptions,
  })

  if (savedWindowState.isMaximized) {
    win.maximize()
  }

  win.on('resize', () => scheduleWindowStateSave(win as BrowserWindow))
  win.on('move', () => scheduleWindowStateSave(win as BrowserWindow))
  win.on('close', (event) => {
    // Window bounds persistence must keep firing on every close attempt regardless of whether the
    // close is later blocked/confirmed by the upload guard below.
    saveWindowState(win as BrowserWindow)

    if (consumeCloseConfirmation()) {
      return
    }

    if (!getUploadActive()) {
      return
    }

    event.preventDefault()
    win?.webContents.send(APP_CONFIRM_CLOSE_REQUESTED)
  })

  if (!app.isPackaged) {
    attachDevToolsWindowPersistence(win.webContents)
  }

  attachTextInputContextMenu(win.webContents)

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  app.setName(appName)
  Menu.setApplicationMenu(null)
  registerAppIpcHandlers()
  registerImportIpcHandlers()
  registerWhatnotImportIpcHandlers()
  registerExportIpcHandlers()

  if (!app.isPackaged) {
    void runDevDerivativeGenerationVerification()
  }

  createWindow()
})
