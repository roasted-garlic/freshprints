var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { app, BrowserWindow, screen, ipcMain, nativeImage, dialog, Menu } from "electron";
import { writeFileSync, existsSync, readFileSync, createWriteStream } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { rm, lstat, mkdir, stat, readdir, readFile, open as open$1 } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { pipeline } from "node:stream/promises";
import require$$0 from "fs";
import require$$1$1 from "zlib";
import require$$1 from "util";
import require$$5 from "stream";
import require$$4 from "events";
const DEVTOOLS_AUTOFILL_NOISE = /Request Autofill\.(enable|setAddresses) failed/i;
function isWriteCallback(value) {
  return typeof value === "function";
}
function suppressDevToolsAutofillConsoleNoise() {
  if (app.isPackaged) {
    return;
  }
  const originalStderrWrite = process.stderr.write.bind(process.stderr);
  process.stderr.write = (chunk, encodingOrCallback, callback) => {
    const text = typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8");
    if (DEVTOOLS_AUTOFILL_NOISE.test(text)) {
      if (isWriteCallback(encodingOrCallback)) {
        encodingOrCallback();
      } else {
        callback == null ? void 0 : callback();
      }
      return true;
    }
    if (isWriteCallback(encodingOrCallback)) {
      return originalStderrWrite(chunk, encodingOrCallback);
    }
    return originalStderrWrite(chunk, encodingOrCallback, callback);
  };
}
function importIpcSuccess(data) {
  return { success: true, data };
}
function importIpcFailure(code, message) {
  const error = { code, message };
  return { success: false, error };
}
const MIN_DEVTOOLS_WIDTH = 320;
const MIN_DEVTOOLS_HEIGHT = 240;
let saveDevToolsStateTimeout = null;
function getDevToolsWindowStatePath() {
  return path.join(app.getPath("userData"), "dev-tools-window-state.json");
}
function isValidDevToolsBounds(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  const bounds = value;
  return typeof bounds.x === "number" && typeof bounds.y === "number" && typeof bounds.width === "number" && typeof bounds.height === "number" && bounds.width >= MIN_DEVTOOLS_WIDTH && bounds.height >= MIN_DEVTOOLS_HEIGHT;
}
function isValidDevToolsWindowState(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  const state = value;
  return isValidDevToolsBounds(state.bounds) && typeof state.displayId === "number";
}
function rectanglesIntersect$1(first, second) {
  return first.x < second.x + second.width && first.x + first.width > second.x && first.y < second.y + second.height && first.y + first.height > second.y;
}
function getDisplayById(displayId) {
  return screen.getAllDisplays().find((display) => display.id === displayId);
}
function clampBoundsToWorkArea(bounds, workArea) {
  const width = Math.min(bounds.width, workArea.width);
  const height = Math.min(bounds.height, workArea.height);
  const x = Math.max(workArea.x, Math.min(bounds.x, workArea.x + workArea.width - width));
  const y = Math.max(workArea.y, Math.min(bounds.y, workArea.y + workArea.height - height));
  return { x, y, width, height };
}
function getFallbackDevToolsBounds() {
  const { workArea } = screen.getPrimaryDisplay();
  return clampBoundsToWorkArea(
    {
      x: workArea.x + 48,
      y: workArea.y + 48,
      width: Math.min(1100, workArea.width - 96),
      height: Math.min(760, workArea.height - 96)
    },
    workArea
  );
}
function loadDevToolsWindowState() {
  try {
    const statePath = getDevToolsWindowStatePath();
    if (!existsSync(statePath)) {
      return null;
    }
    const parsedState = JSON.parse(readFileSync(statePath, "utf-8"));
    if (!isValidDevToolsWindowState(parsedState)) {
      return null;
    }
    return parsedState;
  } catch {
    return null;
  }
}
function saveDevToolsWindowState(devToolsWindow) {
  if (devToolsWindow.isDestroyed()) {
    return;
  }
  const bounds = devToolsWindow.getBounds();
  const display = screen.getDisplayMatching(bounds);
  const state = {
    bounds,
    displayId: display.id
  };
  try {
    writeFileSync(getDevToolsWindowStatePath(), JSON.stringify(state, null, 2));
  } catch {
  }
}
function scheduleDevToolsWindowStateSave(devToolsWindow) {
  if (saveDevToolsStateTimeout) {
    clearTimeout(saveDevToolsStateTimeout);
  }
  saveDevToolsStateTimeout = setTimeout(() => {
    saveDevToolsWindowState(devToolsWindow);
    saveDevToolsStateTimeout = null;
  }, 300);
}
function restoreDevToolsWindowState(devToolsWindow) {
  const savedState = loadDevToolsWindowState();
  if (!savedState) {
    return;
  }
  const savedDisplay = getDisplayById(savedState.displayId);
  const targetDisplay = savedDisplay ?? screen.getPrimaryDisplay();
  const { workArea } = targetDisplay;
  let nextBounds = clampBoundsToWorkArea(savedState.bounds, workArea);
  if (!rectanglesIntersect$1(nextBounds, workArea)) {
    nextBounds = getFallbackDevToolsBounds();
  }
  devToolsWindow.setBounds(nextBounds);
}
function bindDevToolsWindowPersistence(devToolsWindow) {
  if (devToolsWindow.isDestroyed()) {
    return;
  }
  restoreDevToolsWindowState(devToolsWindow);
  devToolsWindow.on("resize", () => scheduleDevToolsWindowStateSave(devToolsWindow));
  devToolsWindow.on("move", () => scheduleDevToolsWindowStateSave(devToolsWindow));
  devToolsWindow.on("close", () => saveDevToolsWindowState(devToolsWindow));
}
function attachDevToolsWindowPersistence(webContents) {
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
function openDetachedDevTools(browserWindow) {
  if (browserWindow.webContents.isDevToolsOpened()) {
    const devToolsWebContents = browserWindow.webContents.devToolsWebContents;
    const devToolsWindow = devToolsWebContents ? BrowserWindow.fromWebContents(devToolsWebContents) : null;
    if (devToolsWindow) {
      devToolsWindow.focus();
    }
    return;
  }
  browserWindow.webContents.openDevTools({ mode: "detach" });
}
const APP_OPEN_DEV_TOOLS = "fresh-prints:app:open-dev-tools";
const APP_IPC_CHANNELS = {
  OPEN_DEV_TOOLS: APP_OPEN_DEV_TOOLS
};
new Set(Object.values(APP_IPC_CHANNELS));
function canOpenDevTools() {
  return !app.isPackaged;
}
function registerAppIpcHandlers() {
  ipcMain.handle(APP_IPC_CHANNELS.OPEN_DEV_TOOLS, async (event) => {
    try {
      if (!canOpenDevTools()) {
        return importIpcFailure(
          "INTERNAL_ERROR",
          "DevTools are only available in development builds."
        );
      }
      const browserWindow = BrowserWindow.fromWebContents(event.sender);
      if (!browserWindow) {
        return importIpcFailure("INTERNAL_ERROR", "The application window could not be found.");
      }
      openDetachedDevTools(browserWindow);
      return importIpcSuccess({ opened: true });
    } catch {
      return importIpcFailure("INTERNAL_ERROR", "An unexpected error occurred while opening DevTools.");
    }
  });
}
const IMPORT_TEMP_ROOT_DIR_NAME = "fresh-prints-imports";
const IMPORT_JOB_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
class InvalidImportJobIdError extends Error {
  constructor(message) {
    super(message);
    this.name = "InvalidImportJobIdError";
  }
}
class ImportTempPathSafetyError extends Error {
  constructor(message) {
    super(message);
    this.name = "ImportTempPathSafetyError";
  }
}
function validateImportJobId(jobId) {
  if (typeof jobId !== "string" || jobId.trim().length === 0) {
    throw new InvalidImportJobIdError("A batch job ID is required.");
  }
  if (jobId.includes("..") || jobId.includes("\0") || jobId.includes("/") || jobId.includes("\\")) {
    throw new InvalidImportJobIdError("The batch job ID contains invalid path characters.");
  }
  if (!IMPORT_JOB_ID_PATTERN.test(jobId)) {
    throw new InvalidImportJobIdError("The batch job ID format is invalid.");
  }
}
function resolveImportTempRootPath(osTempPath) {
  return path.resolve(osTempPath, IMPORT_TEMP_ROOT_DIR_NAME);
}
function resolveJobTempDirPath(osTempPath, jobId) {
  validateImportJobId(jobId);
  const tempRoot = resolveImportTempRootPath(osTempPath);
  const jobDir = path.resolve(tempRoot, jobId);
  if (!isPathInsideImportTempRoot(jobDir, tempRoot)) {
    throw new ImportTempPathSafetyError("The job temp directory path is outside the import temp root.");
  }
  return jobDir;
}
function isPathInsideImportTempRoot(targetPath, tempRootPath) {
  const normalizedRoot = path.resolve(tempRootPath);
  const normalizedTarget = path.resolve(targetPath);
  if (process.platform === "win32") {
    const rootLower = normalizedRoot.toLowerCase();
    const targetLower = normalizedTarget.toLowerCase();
    if (targetLower === rootLower) {
      return true;
    }
    return targetLower.startsWith(`${rootLower}${path.sep}`);
  }
  if (normalizedTarget === normalizedRoot) {
    return true;
  }
  return normalizedTarget.startsWith(`${normalizedRoot}${path.sep}`);
}
function getImportTempRootPath() {
  return resolveImportTempRootPath(app.getPath("temp"));
}
function getJobTempDirPath(jobId) {
  return resolveJobTempDirPath(app.getPath("temp"), jobId);
}
async function ensureDirectoryExists(directoryPath) {
  await mkdir(directoryPath, { recursive: true });
}
async function assertSafeJobTempDirectory(directoryPath) {
  const tempRoot = getImportTempRootPath();
  const resolvedPath = path.resolve(directoryPath);
  if (!isPathInsideImportTempRoot(resolvedPath, tempRoot)) {
    throw new ImportTempPathSafetyError("Refusing to operate on a path outside the import temp root.");
  }
  const directoryStats = await lstat(resolvedPath);
  if (directoryStats.isSymbolicLink()) {
    throw new ImportTempPathSafetyError("Refusing to operate on a symlinked job temp directory.");
  }
  if (!directoryStats.isDirectory()) {
    throw new ImportTempPathSafetyError("The job temp path is not a directory.");
  }
}
async function ensureImportTempRoot() {
  const tempRoot = getImportTempRootPath();
  await ensureDirectoryExists(tempRoot);
  return tempRoot;
}
async function createJobTempDir(jobId) {
  validateImportJobId(jobId);
  const tempRoot = await ensureImportTempRoot();
  const jobDir = resolveJobTempDirPath(app.getPath("temp"), jobId);
  if (!isPathInsideImportTempRoot(jobDir, tempRoot)) {
    throw new ImportTempPathSafetyError("Refusing to create a job temp directory outside the import temp root.");
  }
  await ensureDirectoryExists(jobDir);
  return jobDir;
}
async function deleteJobTempDir(jobId) {
  validateImportJobId(jobId);
  const jobDir = getJobTempDirPath(jobId);
  try {
    await assertSafeJobTempDirectory(jobDir);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
  await rm(jobDir, { recursive: true, force: true, maxRetries: 3 });
  return true;
}
class ZipExtractionError extends Error {
  constructor(code, message) {
    super(message);
    __publicField(this, "code");
    this.name = "ZipExtractionError";
    this.code = code;
  }
}
const IMPORT_SELECT_SINGLE_PNG = "fresh-prints:import:select-single-png";
const IMPORT_VALIDATE_SELECTED_PNG = "fresh-prints:import:validate-selected-png";
const IMPORT_READ_SELECTED_PNG_BYTES = "fresh-prints:import:read-selected-png-bytes";
const IMPORT_GET_SELECTED_PNG_PREVIEW = "fresh-prints:import:get-selected-png-preview";
const IMPORT_SELECT_MULTIPLE_PNG = "fresh-prints:import:select-multiple-png";
const IMPORT_SELECT_IMPORT_FOLDER = "fresh-prints:import:select-import-folder";
const IMPORT_SELECT_IMPORT_ZIP = "fresh-prints:import:select-import-zip";
const IMPORT_START_BATCH_DISCOVERY = "fresh-prints:import:start-batch-discovery";
const IMPORT_CANCEL_BATCH_JOB = "fresh-prints:import:cancel-batch-job";
const IMPORT_FINISH_BATCH_JOB = "fresh-prints:import:finish-batch-job";
const IMPORT_CLEAR_SINGLE_PNG_IMPORT = "fresh-prints:import:clear-single-png-import";
const IMPORT_BATCH_PROGRESS = "fresh-prints:import:batch-progress";
const IMPORT_BATCH_DISCOVERY_COMPLETE = "fresh-prints:import:batch-discovery-complete";
const IMPORT_BATCH_JOB_ERROR = "fresh-prints:import:batch-job-error";
const IMPORT_VERIFY_DERIVATIVE_GENERATION = "fresh-prints:import:verify-derivative-generation";
const IMPORT_IPC_CHANNELS = {
  SELECT_SINGLE_PNG: IMPORT_SELECT_SINGLE_PNG,
  VALIDATE_SELECTED_PNG: IMPORT_VALIDATE_SELECTED_PNG,
  READ_SELECTED_PNG_BYTES: IMPORT_READ_SELECTED_PNG_BYTES,
  GET_SELECTED_PNG_PREVIEW: IMPORT_GET_SELECTED_PNG_PREVIEW,
  SELECT_MULTIPLE_PNG: IMPORT_SELECT_MULTIPLE_PNG,
  SELECT_IMPORT_FOLDER: IMPORT_SELECT_IMPORT_FOLDER,
  SELECT_IMPORT_ZIP: IMPORT_SELECT_IMPORT_ZIP,
  START_BATCH_DISCOVERY: IMPORT_START_BATCH_DISCOVERY,
  CANCEL_BATCH_JOB: IMPORT_CANCEL_BATCH_JOB,
  FINISH_BATCH_JOB: IMPORT_FINISH_BATCH_JOB,
  CLEAR_SINGLE_PNG_IMPORT: IMPORT_CLEAR_SINGLE_PNG_IMPORT
};
const DEV_IMPORT_IPC_CHANNELS = {
  VERIFY_DERIVATIVE_GENERATION: IMPORT_VERIFY_DERIVATIVE_GENERATION
};
const IMPORT_IPC_EVENT_CHANNELS = {
  BATCH_PROGRESS: IMPORT_BATCH_PROGRESS,
  BATCH_DISCOVERY_COMPLETE: IMPORT_BATCH_DISCOVERY_COMPLETE,
  BATCH_JOB_ERROR: IMPORT_BATCH_JOB_ERROR
};
new Set(Object.values(IMPORT_IPC_CHANNELS));
new Set(
  Object.values(IMPORT_IPC_EVENT_CHANNELS)
);
new Set(Object.values(DEV_IMPORT_IPC_CHANNELS));
function emitBatchImportProgress(webContents, event) {
  if (webContents.isDestroyed()) {
    return;
  }
  webContents.send(IMPORT_IPC_EVENT_CHANNELS.BATCH_PROGRESS, event);
}
function emitBatchDiscoveryComplete(webContents, event) {
  if (webContents.isDestroyed()) {
    return;
  }
  webContents.send(IMPORT_IPC_EVENT_CHANNELS.BATCH_DISCOVERY_COMPLETE, event);
}
function emitBatchJobError(webContents, event) {
  if (webContents.isDestroyed()) {
    return;
  }
  webContents.send(IMPORT_IPC_EVENT_CHANNELS.BATCH_JOB_ERROR, event);
}
class BatchDiscoveryFatalError extends Error {
  constructor(code, message, cleanupZipTemp = false) {
    super(message);
    __publicField(this, "cleanupZipTemp");
    __publicField(this, "code");
    this.name = "BatchDiscoveryFatalError";
    this.code = code;
    this.cleanupZipTemp = cleanupZipTemp;
  }
}
const sessionsByJobId = /* @__PURE__ */ new Map();
const cancelRequestedJobIds = /* @__PURE__ */ new Set();
const validatedPathsByJobId = /* @__PURE__ */ new Map();
const runningDiscoveryJobIds = /* @__PURE__ */ new Set();
const ACTIVE_BATCH_STATUSES = /* @__PURE__ */ new Set(["selected", "discovering"]);
function normalizeSessionPaths(paths) {
  return paths.map((filePath) => path.normalize(filePath));
}
function hasActiveBatchImportSession() {
  for (const session of sessionsByJobId.values()) {
    if (ACTIVE_BATCH_STATUSES.has(session.status)) {
      return true;
    }
  }
  return false;
}
function getBatchImportSession(jobId) {
  return sessionsByJobId.get(jobId);
}
function registerBatchImportSelection(input) {
  if (hasActiveBatchImportSession()) {
    throw new Error("A batch import session is already active.");
  }
  const jobId = randomUUID();
  const session = {
    jobId,
    webContentsId: input.webContentsId,
    sourceType: input.sourceType,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    status: "selected"
  };
  if (input.filePaths) {
    session.filePaths = normalizeSessionPaths(input.filePaths);
  }
  if (input.folderPath) {
    session.folderPath = path.normalize(input.folderPath);
  }
  if (input.zipFilePath) {
    session.zipFilePath = path.normalize(input.zipFilePath);
  }
  sessionsByJobId.set(jobId, session);
  return session;
}
function validateBatchDiscoverySession(jobId, webContentsId, sourceType) {
  const session = sessionsByJobId.get(jobId);
  if (!session) {
    return "No batch import session was found for the provided job ID.";
  }
  if (session.webContentsId !== webContentsId) {
    return "The batch import session does not belong to this window.";
  }
  if (!ACTIVE_BATCH_STATUSES.has(session.status)) {
    return "The batch import session is no longer active.";
  }
  if (session.sourceType !== sourceType) {
    return "The batch import source type does not match the registered session.";
  }
  return null;
}
function validateBatchDiscoveryStart(jobId, webContentsId, sourceType) {
  var _a;
  const sessionError = validateBatchDiscoverySession(jobId, webContentsId, sourceType);
  if (sessionError) {
    return sessionError;
  }
  const session = sessionsByJobId.get(jobId);
  if (!session || session.status !== "selected") {
    return "Batch discovery can only start from a newly selected batch session.";
  }
  if (runningDiscoveryJobIds.has(jobId)) {
    return "Batch discovery is already in progress for this job.";
  }
  if (sourceType === "multiple-png" && (((_a = session.filePaths) == null ? void 0 : _a.length) ?? 0) === 0) {
    return "The batch session does not contain any selected PNG files.";
  }
  if (sourceType === "folder" && !session.folderPath) {
    return "The batch session does not contain a selected folder.";
  }
  if (sourceType === "zip" && !session.zipFilePath) {
    return "The batch session does not contain a selected ZIP file.";
  }
  return null;
}
function markBatchDiscoveryRunning(jobId) {
  if (runningDiscoveryJobIds.has(jobId)) {
    return false;
  }
  runningDiscoveryJobIds.add(jobId);
  return true;
}
function clearBatchDiscoveryRunning(jobId) {
  runningDiscoveryJobIds.delete(jobId);
}
function isBatchImportCancelRequested(jobId) {
  return cancelRequestedJobIds.has(jobId);
}
function clearBatchImportCancelRequest(jobId) {
  cancelRequestedJobIds.delete(jobId);
}
function registerBatchValidatedPath(jobId, filePath) {
  const normalizedPath = path.normalize(filePath);
  const validatedPaths = validatedPathsByJobId.get(jobId) ?? /* @__PURE__ */ new Set();
  validatedPaths.add(normalizedPath);
  validatedPathsByJobId.set(jobId, validatedPaths);
}
function isBatchValidatedPath(jobId, filePath) {
  var _a;
  return ((_a = validatedPathsByJobId.get(jobId)) == null ? void 0 : _a.has(path.normalize(filePath))) ?? false;
}
function clearBatchValidatedPaths(jobId) {
  validatedPathsByJobId.delete(jobId);
}
function getBatchSessionFilePaths(jobId) {
  const session = sessionsByJobId.get(jobId);
  if (!(session == null ? void 0 : session.filePaths)) {
    return [];
  }
  return [...session.filePaths];
}
function getBatchSessionFolderPath(jobId) {
  const session = sessionsByJobId.get(jobId);
  return (session == null ? void 0 : session.folderPath) ?? null;
}
function getBatchSessionZipPath(jobId) {
  const session = sessionsByJobId.get(jobId);
  return (session == null ? void 0 : session.zipFilePath) ?? null;
}
function markBatchImportSessionDiscovering(jobId) {
  const session = sessionsByJobId.get(jobId);
  if (!session || session.status !== "selected") {
    return false;
  }
  session.status = "discovering";
  return true;
}
function requestBatchImportCancel(jobId, webContentsId) {
  const session = sessionsByJobId.get(jobId);
  if (!session || session.webContentsId !== webContentsId) {
    return false;
  }
  if (!ACTIVE_BATCH_STATUSES.has(session.status)) {
    return false;
  }
  if (session.status === "discovering") {
    cancelRequestedJobIds.add(jobId);
    return true;
  }
  session.status = "cancelled";
  sessionsByJobId.delete(jobId);
  clearBatchValidatedPaths(jobId);
  clearBatchImportCancelRequest(jobId);
  clearBatchDiscoveryRunning(jobId);
  return true;
}
function completeBatchImportDiscovery(jobId, canceled) {
  finalizeBatchImportDiscovery(jobId, canceled ? "canceled" : "completed");
}
function failBatchImportDiscovery(jobId) {
  finalizeBatchImportDiscovery(jobId, "failed");
}
function finalizeBatchImportDiscovery(jobId, outcome) {
  clearBatchDiscoveryRunning(jobId);
  clearBatchImportCancelRequest(jobId);
  const session = sessionsByJobId.get(jobId);
  if (!session) {
    return;
  }
  if (outcome === "completed") {
    session.status = "discovering";
    return;
  }
  session.status = outcome === "canceled" ? "cancelled" : "failed";
  sessionsByJobId.delete(jobId);
  clearBatchValidatedPaths(jobId);
}
function finishBatchImportSession(jobId, webContentsId) {
  const session = sessionsByJobId.get(jobId);
  if (!session || session.webContentsId !== webContentsId) {
    return false;
  }
  session.status = "finished";
  sessionsByJobId.delete(jobId);
  clearBatchValidatedPaths(jobId);
  clearBatchImportCancelRequest(jobId);
  clearBatchDiscoveryRunning(jobId);
  return true;
}
const MAX_SINGLE_PNG_SIZE_BYTES = 50 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".png"];
const PNG_MAGIC_BYTES = [137, 80, 78, 71, 13, 10, 26, 10];
const METERS_PER_INCH = 0.0254;
const MAX_BATCH_FILES = 100;
const MAX_ZIP_SIZE_BYTES = 200 * 1024 * 1024;
const MAX_EXTRACTED_BYTES = 500 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 500;
const MAX_ZIP_COMPRESSION_RATIO = 100;
const MAX_FOLDER_SCAN_ENTRIES = 1e4;
const MAX_FOLDER_DEPTH = 12;
const IGNORE_DIR_NAMES = /* @__PURE__ */ new Set([
  ".git",
  "node_modules",
  "$RECYCLE.BIN",
  "System Volume Information"
]);
function hasPngExtension$1(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return ALLOWED_EXTENSIONS.some((allowedExtension) => allowedExtension === extension);
}
function compareEntryNames(left, right) {
  return left.localeCompare(right, void 0, { sensitivity: "base" });
}
function isPathInsideRoot(targetPath, rootPath) {
  const normalizedRoot = path.resolve(rootPath);
  const normalizedTarget = path.resolve(targetPath);
  if (process.platform === "win32") {
    const rootLower = normalizedRoot.toLowerCase();
    const targetLower = normalizedTarget.toLowerCase();
    if (targetLower === rootLower) {
      return true;
    }
    return targetLower.startsWith(`${rootLower}${path.sep}`);
  }
  if (normalizedTarget === normalizedRoot) {
    return true;
  }
  return normalizedTarget.startsWith(`${normalizedRoot}${path.sep}`);
}
function toPosixRelativePath(relativePath) {
  return relativePath.split(path.sep).join("/");
}
async function scanDirectory(options2) {
  var _a;
  if (options2.shouldCancel()) {
    return;
  }
  if (options2.result.entriesScanned >= MAX_FOLDER_SCAN_ENTRIES) {
    options2.result.truncated = true;
    options2.result.truncationReason = "MAX_FOLDER_SCAN_ENTRIES";
    return;
  }
  let entries;
  try {
    entries = await readdir(options2.currentPath, { withFileTypes: true });
  } catch {
    return;
  }
  entries.sort((left, right) => compareEntryNames(left.name, right.name));
  for (const entry of entries) {
    if (options2.shouldCancel()) {
      return;
    }
    if (options2.result.entriesScanned >= MAX_FOLDER_SCAN_ENTRIES) {
      options2.result.truncated = true;
      options2.result.truncationReason = "MAX_FOLDER_SCAN_ENTRIES";
      return;
    }
    options2.result.entriesScanned += 1;
    (_a = options2.onProgress) == null ? void 0 : _a.call(options2, {
      entriesScanned: options2.result.entriesScanned,
      pngsDiscovered: options2.result.pngsDiscovered
    });
    const entryPath = path.join(options2.currentPath, entry.name);
    if (!isPathInsideRoot(entryPath, options2.rootPath)) {
      continue;
    }
    let entryStats;
    try {
      entryStats = await lstat(entryPath);
    } catch {
      continue;
    }
    if (entryStats.isSymbolicLink()) {
      continue;
    }
    if (entryStats.isDirectory()) {
      if (IGNORE_DIR_NAMES.has(entry.name)) {
        continue;
      }
      const childDepth = options2.depth + 1;
      if (childDepth > MAX_FOLDER_DEPTH) {
        options2.result.directoriesSkippedDepth += 1;
        options2.result.truncated = true;
        options2.result.truncationReason = "MAX_FOLDER_DEPTH";
        continue;
      }
      await scanDirectory({
        ...options2,
        currentPath: entryPath,
        depth: childDepth
      });
      continue;
    }
    if (!entryStats.isFile()) {
      continue;
    }
    if (!hasPngExtension$1(entryPath)) {
      continue;
    }
    options2.result.pngsDiscovered += 1;
    if (options2.result.candidates.length >= MAX_BATCH_FILES) {
      options2.result.truncated = true;
      options2.result.truncationReason = "MAX_BATCH_FILES";
      continue;
    }
    const relativePath = toPosixRelativePath(path.relative(options2.rootPath, entryPath));
    options2.result.candidates.push({
      absolutePath: path.normalize(entryPath),
      fileName: entry.name,
      relativePath
    });
  }
}
async function scanFolderForPngFiles(rootPath, shouldCancel, onProgress) {
  const normalizedRoot = path.normalize(rootPath);
  const rootStats = await stat(normalizedRoot);
  if (!rootStats.isDirectory()) {
    throw new Error("The selected path is not a folder.");
  }
  const result = {
    candidates: [],
    directoriesSkippedDepth: 0,
    entriesScanned: 0,
    pngsDiscovered: 0,
    truncated: false
  };
  await scanDirectory({
    currentPath: normalizedRoot,
    depth: 0,
    onProgress,
    result,
    rootPath: normalizedRoot,
    shouldCancel
  });
  result.candidates.sort((left, right) => compareEntryNames(left.relativePath, right.relativePath));
  return result;
}
function buildProgressCounts(files) {
  const validated = files.filter((file) => file.outcome === "validated").length;
  const rejected = files.filter((file) => file.outcome === "rejected").length;
  return {
    success: validated,
    failed: 0,
    rejected,
    skipped: 0
  };
}
function buildProgressEventKey(event) {
  return [
    event.jobId,
    event.phase,
    event.fileIndex,
    event.fileTotal,
    event.status,
    event.currentFileName,
    event.message ?? "",
    event.counts.success,
    event.counts.rejected,
    event.counts.failed,
    event.counts.skipped
  ].join("|");
}
function createDiscoveryProgressEmitter(webContents) {
  let lastEventKey = "";
  return function emitDiscoveryProgress(event) {
    const eventKey = buildProgressEventKey(event);
    if (eventKey === lastEventKey) {
      return;
    }
    lastEventKey = eventKey;
    emitBatchImportProgress(webContents, event);
  };
}
function emitDiscoveryFinished(webContents, emitDiscoveryProgress, input) {
  const { canceled, fileTotal, files, jobId, pngsDiscovered, sourceType, truncated } = input;
  const summary = {
    discovered: pngsDiscovered,
    skipped: 0,
    rejected: files.filter((file) => file.outcome === "rejected").length,
    validated: files.filter((file) => file.outcome === "validated").length
  };
  const completeEvent = {
    jobId,
    canceled,
    truncated,
    sourceType,
    summary,
    files
  };
  emitDiscoveryProgress({
    jobId,
    phase: "complete",
    fileIndex: canceled ? files.length : fileTotal,
    fileTotal,
    currentFileName: "",
    status: canceled ? "cancelled" : "success",
    message: canceled ? "Batch discovery canceled" : "Batch discovery complete",
    counts: buildProgressCounts(files)
  });
  emitBatchDiscoveryComplete(webContents, completeEvent);
}
const TARGET_PRINT_DPI = 300;
const MIN_SMALL_FORMAT_PRINT_WIDTH_INCHES = 3.5;
const STANDARD_PRINT_WIDTH_INCHES = 8;
const PREFERRED_PRINT_WIDTH_INCHES = 10;
const PRINT_INCHES_DECIMAL_PLACES = 2;
function roundInches(value) {
  const factor = 10 ** PRINT_INCHES_DECIMAL_PLACES;
  return Math.round(value * factor) / factor;
}
function validatePositivePixels(pixelWidth, pixelHeight) {
  if (!Number.isFinite(pixelWidth) || pixelWidth <= 0) {
    return "Pixel width must be a positive finite number.";
  }
  if (!Number.isFinite(pixelHeight) || pixelHeight <= 0) {
    return "Pixel height must be a positive finite number.";
  }
  return null;
}
function validatePositiveTargetDpi(targetDpi) {
  if (!Number.isFinite(targetDpi) || targetDpi <= 0) {
    return "Target DPI must be a positive finite number.";
  }
  return null;
}
function resolveAcceptanceLevel(maxPrintWidthInchesAtTarget) {
  if (maxPrintWidthInchesAtTarget < MIN_SMALL_FORMAT_PRINT_WIDTH_INCHES) {
    return "reject";
  }
  if (maxPrintWidthInchesAtTarget < STANDARD_PRINT_WIDTH_INCHES) {
    return "small_format";
  }
  if (maxPrintWidthInchesAtTarget < PREFERRED_PRINT_WIDTH_INCHES) {
    return "warn";
  }
  return "accept";
}
function assessPrintSizeCapability(pixelWidth, pixelHeight, targetDpi = TARGET_PRINT_DPI) {
  const pixelError = validatePositivePixels(pixelWidth, pixelHeight);
  if (pixelError) {
    return { success: false, error: pixelError };
  }
  const dpiError = validatePositiveTargetDpi(targetDpi);
  if (dpiError) {
    return { success: false, error: dpiError };
  }
  const maxPrintWidthInchesAtTarget = pixelWidth / targetDpi;
  const maxPrintHeightInchesAtTarget = pixelHeight / targetDpi;
  const acceptanceLevel = resolveAcceptanceLevel(maxPrintWidthInchesAtTarget);
  const assessment = {
    targetDpi,
    maxPrintWidthInchesAtTarget,
    maxPrintHeightInchesAtTarget,
    acceptanceLevel,
    meetsSmallFormatMinimum: maxPrintWidthInchesAtTarget >= MIN_SMALL_FORMAT_PRINT_WIDTH_INCHES,
    meetsStandardApparelWidth: maxPrintWidthInchesAtTarget >= STANDARD_PRINT_WIDTH_INCHES,
    meetsPreferredWidth: maxPrintWidthInchesAtTarget >= PREFERRED_PRINT_WIDTH_INCHES,
    suggestedPrintWidthInches: roundInches(maxPrintWidthInchesAtTarget),
    suggestedPrintHeightInches: roundInches(maxPrintHeightInchesAtTarget),
    suggestedEffectiveDpi: targetDpi
  };
  return { success: true, assessment };
}
function formatInches(value) {
  return value.toFixed(PRINT_INCHES_DECIMAL_PLACES);
}
function formatPrintSizeNormalizedMessage(printWidthInches, printHeightInches, targetDpi = TARGET_PRINT_DPI) {
  return `Print size normalized to ${formatInches(printWidthInches)} in × ${formatInches(printHeightInches)} in at ${targetDpi} DPI.`;
}
function formatPrintSizeStandardApparelMessage() {
  return "Image meets standard apparel print size but is below the preferred 10 inch width.";
}
function formatPrintSizeSmallFormatMessage() {
  return "Image is suitable for small-format prints at 300 DPI, but may require upscaling for larger apparel prints.";
}
function formatPrintSizeRejectedMessage(minWidthInches = MIN_SMALL_FORMAT_PRINT_WIDTH_INCHES, targetDpi = TARGET_PRINT_DPI) {
  return `Image cannot achieve the minimum ${minWidthInches} inch print width at ${targetDpi} DPI.`;
}
function isUnsafeClientFilePath(filePath) {
  if (!filePath.trim()) {
    return true;
  }
  if (filePath.includes("\0")) {
    return true;
  }
  if (filePath.includes("..")) {
    return true;
  }
  return false;
}
function getFileExtension(filePath) {
  return path.extname(filePath).toLowerCase();
}
function hasAllowedExtension(filePath) {
  const extension = getFileExtension(filePath);
  return ALLOWED_EXTENSIONS.some((allowedExtension) => allowedExtension === extension);
}
function getFileName(filePath) {
  return path.basename(filePath);
}
const PNG_SIGNATURE = Buffer.from(PNG_MAGIC_BYTES);
function hasValidPngMagicBytes(buffer) {
  if (buffer.length < PNG_SIGNATURE.length) {
    return false;
  }
  return buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE);
}
function parsePngMetadata(buffer) {
  if (!hasValidPngMagicBytes(buffer)) {
    throw new Error("The file does not contain a valid PNG signature.");
  }
  let width = 0;
  let height = 0;
  let dpiX;
  let dpiY;
  let hasDpiMetadata = false;
  let dpiSource;
  let foundIHDR = false;
  let offset = PNG_SIGNATURE.length;
  while (offset + 12 <= buffer.length) {
    const chunkLength = buffer.readUInt32BE(offset);
    const chunkType = buffer.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + chunkLength;
    if (dataEnd + 4 > buffer.length) {
      throw new Error("The PNG file header is incomplete or corrupt.");
    }
    if (chunkType === "IHDR" && chunkLength >= 13) {
      width = buffer.readUInt32BE(dataStart);
      height = buffer.readUInt32BE(dataStart + 4);
      foundIHDR = true;
    }
    if (chunkType === "pHYs" && chunkLength >= 9) {
      const pixelsPerUnitX = buffer.readUInt32BE(dataStart);
      const pixelsPerUnitY = buffer.readUInt32BE(dataStart + 4);
      const unitSpecifier = buffer.readUInt8(dataStart + 8);
      if (unitSpecifier === 1 && pixelsPerUnitX > 0 && pixelsPerUnitY > 0) {
        dpiX = pixelsPerUnitX * METERS_PER_INCH;
        dpiY = pixelsPerUnitY * METERS_PER_INCH;
        hasDpiMetadata = true;
        dpiSource = "pHYs";
      }
    }
    if (chunkType === "IEND") {
      break;
    }
    offset = dataEnd + 4;
  }
  if (!foundIHDR || width <= 0 || height <= 0) {
    throw new Error("The PNG file is missing required image dimensions.");
  }
  return {
    width,
    height,
    dpiX,
    dpiY,
    hasDpiMetadata,
    dpiSource
  };
}
class PngValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "PngValidationError";
  }
}
function roundDpi(value) {
  return Math.round(value * 100) / 100;
}
function buildDpiMetadataWarnings(dpiX, dpiY) {
  if (dpiX === void 0 || dpiY === void 0) {
    return [
      {
        code: "DPI_METADATA_MISSING",
        message: "PNG does not contain DPI metadata."
      }
    ];
  }
  return [];
}
function buildPrintSizeWarnings(assessment) {
  const warnings = [
    {
      code: "PRINT_SIZE_NORMALIZED",
      message: formatPrintSizeNormalizedMessage(
        assessment.suggestedPrintWidthInches,
        assessment.suggestedPrintHeightInches,
        assessment.targetDpi
      )
    }
  ];
  if (assessment.acceptanceLevel === "warn") {
    warnings.push({
      code: "PRINT_SIZE_BELOW_PREFERRED",
      message: formatPrintSizeStandardApparelMessage()
    });
  }
  if (assessment.acceptanceLevel === "small_format") {
    warnings.push({
      code: "PRINT_SIZE_SMALL_FORMAT",
      message: formatPrintSizeSmallFormatMessage()
    });
  }
  return warnings;
}
async function validatePngFile(filePath) {
  if (!hasAllowedExtension(filePath)) {
    throw new PngValidationError("Only PNG files with a .png extension can be imported.");
  }
  const fileStats = await stat(filePath);
  if (!fileStats.isFile()) {
    throw new PngValidationError("The selected path is not a file.");
  }
  if (fileStats.size > MAX_SINGLE_PNG_SIZE_BYTES) {
    throw new PngValidationError(
      `The PNG file exceeds the maximum allowed size of ${MAX_SINGLE_PNG_SIZE_BYTES} bytes.`
    );
  }
  const fileBuffer = await readFile(filePath);
  const metadata = parsePngMetadata(fileBuffer);
  const assessmentResult = assessPrintSizeCapability(metadata.width, metadata.height);
  if (!assessmentResult.success) {
    throw new PngValidationError(assessmentResult.error);
  }
  if (assessmentResult.assessment.acceptanceLevel === "reject") {
    throw new PngValidationError(formatPrintSizeRejectedMessage());
  }
  const roundedDpiX = metadata.dpiX !== void 0 ? roundDpi(metadata.dpiX) : void 0;
  const roundedDpiY = metadata.dpiY !== void 0 ? roundDpi(metadata.dpiY) : void 0;
  const warnings = [
    ...buildDpiMetadataWarnings(roundedDpiX, roundedDpiY),
    ...buildPrintSizeWarnings(assessmentResult.assessment)
  ];
  return {
    valid: true,
    filePath,
    fileName: getFileName(filePath),
    fileSizeBytes: fileStats.size,
    width: metadata.width,
    height: metadata.height,
    dpiX: roundedDpiX,
    dpiY: roundedDpiY,
    hasDpiMetadata: metadata.hasDpiMetadata,
    dpiSource: metadata.dpiSource,
    printSizeAssessment: assessmentResult.assessment,
    warnings
  };
}
function getSelectedPngExtension(filePath) {
  return getFileExtension(filePath) || ".png";
}
function mapPngValidationFailureToRejection(filePath, error) {
  const fileName = getFileName(filePath);
  if (error instanceof PngValidationError) {
    if (error.message.includes("maximum allowed size")) {
      return {
        reasonCode: "FILE_TOO_LARGE",
        message: error.message
      };
    }
    if (error.message.startsWith("Image cannot achieve")) {
      return {
        reasonCode: "PRINT_SIZE_INSUFFICIENT",
        message: error.message
      };
    }
    return {
      reasonCode: "INVALID_PNG",
      message: error.message
    };
  }
  if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
    return {
      reasonCode: "FILE_NOT_FOUND",
      message: `The file "${fileName}" could not be found.`
    };
  }
  const message = error instanceof Error ? error.message : `Validation failed for "${fileName}".`;
  return {
    reasonCode: "VALIDATION_ERROR",
    message
  };
}
async function runFolderBatchDiscovery(jobId, webContents) {
  var _a;
  const emitDiscoveryProgress = createDiscoveryProgressEmitter(webContents);
  const folderPath = getBatchSessionFolderPath(jobId);
  const files = [];
  let canceled = false;
  let truncated = false;
  let pngsDiscovered = 0;
  let lastScanProgressKey = "";
  if (!folderPath) {
    throw new BatchDiscoveryFatalError(
      "INVALID_INPUT",
      "The batch session does not contain a selected folder."
    );
  }
  emitDiscoveryProgress({
    jobId,
    phase: "discovering",
    fileIndex: 0,
    fileTotal: 0,
    currentFileName: "",
    status: "running",
    message: "Scanning folder for PNG files",
    counts: buildProgressCounts(files)
  });
  let scanResult;
  try {
    scanResult = await scanFolderForPngFiles(
      folderPath,
      () => isBatchImportCancelRequested(jobId),
      ({ entriesScanned, pngsDiscovered: discoveredCount }) => {
        const scanProgressKey = `${entriesScanned}|${discoveredCount}`;
        if (scanProgressKey === lastScanProgressKey) {
          return;
        }
        lastScanProgressKey = scanProgressKey;
        emitDiscoveryProgress({
          jobId,
          phase: "discovering",
          fileIndex: entriesScanned,
          fileTotal: 0,
          currentFileName: "",
          status: "running",
          message: `Scanning folder (${discoveredCount} PNG${discoveredCount === 1 ? "" : "s"} found)`,
          counts: buildProgressCounts(files)
        });
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "The selected folder could not be scanned.";
    throw new BatchDiscoveryFatalError("FILE_NOT_FOUND", message);
  }
  if (isBatchImportCancelRequested(jobId)) {
    canceled = true;
  }
  truncated = scanResult.truncated;
  pngsDiscovered = scanResult.pngsDiscovered;
  const candidates = scanResult.candidates;
  const fileTotal = candidates.length;
  for (let index = 0; index < candidates.length; index += 1) {
    if (isBatchImportCancelRequested(jobId)) {
      canceled = true;
      break;
    }
    const candidate = candidates[index];
    try {
      const validation = await validatePngFile(candidate.absolutePath);
      registerBatchValidatedPath(jobId, candidate.absolutePath);
      files.push({
        filePath: candidate.absolutePath,
        displayName: validation.fileName,
        relativePath: candidate.relativePath,
        fileSizeBytes: validation.fileSizeBytes,
        sourceType: "folder",
        outcome: "validated",
        validation
      });
    } catch (error) {
      files.push({
        filePath: candidate.absolutePath,
        displayName: candidate.fileName,
        relativePath: candidate.relativePath,
        fileSizeBytes: 0,
        sourceType: "folder",
        outcome: "rejected",
        rejection: mapPngValidationFailureToRejection(candidate.absolutePath, error)
      });
    }
    emitDiscoveryProgress({
      jobId,
      phase: "validating",
      fileIndex: index + 1,
      fileTotal,
      currentFileName: candidate.fileName,
      status: canceled ? "cancelled" : ((_a = files.at(-1)) == null ? void 0 : _a.outcome) === "validated" ? "success" : "rejected",
      message: `Validated ${candidate.fileName}`,
      counts: buildProgressCounts(files)
    });
  }
  emitDiscoveryFinished(webContents, emitDiscoveryProgress, {
    canceled,
    fileTotal,
    files,
    jobId,
    pngsDiscovered,
    sourceType: "folder",
    truncated
  });
  return canceled;
}
function mapZipExtractionErrorToJobError(jobId, error) {
  if (error instanceof ZipExtractionError) {
    return {
      jobId,
      code: error.code,
      message: error.message
    };
  }
  return {
    jobId,
    code: "ZIP_CORRUPT",
    message: error instanceof Error ? error.message : "The ZIP archive could not be extracted."
  };
}
async function runMultiplePngBatchDiscovery(jobId, webContents) {
  var _a;
  const emitDiscoveryProgress = createDiscoveryProgressEmitter(webContents);
  const filePaths = getBatchSessionFilePaths(jobId);
  const fileTotal = filePaths.length;
  const files = [];
  let canceled = false;
  emitDiscoveryProgress({
    jobId,
    phase: "discovering",
    fileIndex: 0,
    fileTotal,
    currentFileName: "",
    status: "running",
    message: "Starting batch discovery",
    counts: buildProgressCounts(files)
  });
  for (let index = 0; index < filePaths.length; index += 1) {
    if (isBatchImportCancelRequested(jobId)) {
      canceled = true;
      break;
    }
    const filePath = filePaths[index];
    const fileName = getFileName(filePath);
    try {
      const validation = await validatePngFile(filePath);
      registerBatchValidatedPath(jobId, filePath);
      files.push({
        filePath,
        displayName: validation.fileName,
        fileSizeBytes: validation.fileSizeBytes,
        sourceType: "multiple-png",
        outcome: "validated",
        validation
      });
    } catch (error) {
      files.push({
        filePath,
        displayName: fileName,
        fileSizeBytes: 0,
        sourceType: "multiple-png",
        outcome: "rejected",
        rejection: mapPngValidationFailureToRejection(filePath, error)
      });
    }
    emitDiscoveryProgress({
      jobId,
      phase: "validating",
      fileIndex: index + 1,
      fileTotal,
      currentFileName: fileName,
      status: canceled ? "cancelled" : ((_a = files.at(-1)) == null ? void 0 : _a.outcome) === "validated" ? "success" : "rejected",
      message: `Validated ${fileName}`,
      counts: buildProgressCounts(files)
    });
  }
  emitDiscoveryFinished(webContents, emitDiscoveryProgress, {
    canceled,
    fileTotal,
    files,
    jobId,
    pngsDiscovered: fileTotal,
    sourceType: "multiple-png",
    truncated: false
  });
  return canceled;
}
var yauzl = {};
var fdSlicer = {};
var pend = Pend$1;
function Pend$1() {
  this.pending = 0;
  this.max = Infinity;
  this.listeners = [];
  this.waiting = [];
  this.error = null;
}
Pend$1.prototype.go = function(fn) {
  if (this.pending < this.max) {
    pendGo(this, fn);
  } else {
    this.waiting.push(fn);
  }
};
Pend$1.prototype.wait = function(cb) {
  if (this.pending === 0) {
    cb(this.error);
  } else {
    this.listeners.push(cb);
  }
};
Pend$1.prototype.hold = function() {
  return pendHold(this);
};
function pendHold(self) {
  self.pending += 1;
  var called = false;
  return onCb;
  function onCb(err) {
    if (called) throw new Error("callback called twice");
    called = true;
    self.error = self.error || err;
    self.pending -= 1;
    if (self.waiting.length > 0 && self.pending < self.max) {
      pendGo(self, self.waiting.shift());
    } else if (self.pending === 0) {
      var listeners = self.listeners;
      self.listeners = [];
      listeners.forEach(cbListener);
    }
  }
  function cbListener(listener) {
    listener(self.error);
  }
}
function pendGo(self, fn) {
  fn(pendHold(self));
}
var fs$1 = require$$0;
var util$1 = require$$1;
var stream = require$$5;
var Readable = stream.Readable;
var PassThrough$1 = stream.PassThrough;
var Pend = pend;
var EventEmitter$1 = require$$4.EventEmitter;
fdSlicer.BufferSlicer = BufferSlicer;
fdSlicer.FdSlicer = FdSlicer;
util$1.inherits(FdSlicer, EventEmitter$1);
function FdSlicer(fd) {
  EventEmitter$1.call(this);
  this.fd = fd;
  this.pend = new Pend();
  this.pend.max = 1;
  this.refCount = 0;
}
FdSlicer.prototype.read = function(buffer, offset, length, position, callback) {
  var self = this;
  self.pend.go(function(cb) {
    fs$1.read(self.fd, buffer, offset, length, position, function(err, bytesRead, buffer2) {
      cb();
      callback(err, bytesRead, buffer2);
    });
  });
};
FdSlicer.prototype.createReadStream = function(options2) {
  return new ReadStream(this, options2);
};
FdSlicer.prototype.ref = function() {
  this.refCount += 1;
};
FdSlicer.prototype.unref = function() {
  var self = this;
  self.refCount -= 1;
  if (self.refCount < 0) throw new Error("invalid unref");
  if (self.refCount > 0) return;
  fs$1.close(self.fd, onCloseDone);
  function onCloseDone(err) {
    if (err) {
      self.emit("error", err);
    } else {
      self.emit("close");
    }
  }
};
util$1.inherits(ReadStream, Readable);
function ReadStream(context, options2) {
  options2 = options2 || {};
  Readable.call(this, options2);
  this.context = context;
  this.context.ref();
  this.start = options2.start || 0;
  this.endOffset = options2.end;
  this.pos = this.start;
}
ReadStream.prototype._read = function(n) {
  var self = this;
  var toRead = Math.min(self._readableState.highWaterMark, n);
  if (self.endOffset != null) {
    toRead = Math.min(toRead, self.endOffset - self.pos);
  }
  if (toRead <= 0) {
    self.push(null);
    this._cleanup();
    return;
  }
  self.context.pend.go(function(cb) {
    var buffer = Buffer.allocUnsafe(toRead);
    fs$1.read(self.context.fd, buffer, 0, toRead, self.pos, function(err, bytesRead) {
      if (err) {
        self.destroy(err);
      } else if (bytesRead === 0) {
        self.push(null);
        self._cleanup();
      } else {
        self.pos += bytesRead;
        self.push(buffer.slice(0, bytesRead));
      }
      cb();
    });
  });
};
ReadStream.prototype._destroy = function(err, cb) {
  this._cleanup();
  cb(err);
};
ReadStream.prototype._cleanup = function() {
  if (this.context != null) {
    this.context.unref();
    this.context = null;
  }
};
util$1.inherits(BufferSlicer, EventEmitter$1);
function BufferSlicer(buffer) {
  EventEmitter$1.call(this);
  this.refCount = 0;
  this.buffer = buffer;
}
BufferSlicer.prototype.read = function(buffer, offset, length, position, callback) {
  if (!(0 <= offset && offset <= buffer.length)) throw new RangeError("offset outside buffer: 0 <= " + offset + " <= " + buffer.length);
  if (position < 0) throw new RangeError("position is negative: " + position);
  if (offset + length > buffer.length) {
    length = buffer.length - offset;
  }
  if (position + length > this.buffer.length) {
    length = this.buffer.length - position;
  }
  if (length <= 0) {
    setImmediate(function() {
      callback(null, 0);
    });
    return;
  }
  this.buffer.copy(buffer, offset, position, position + length);
  setImmediate(function() {
    callback(null, length);
  });
};
BufferSlicer.prototype.createReadStream = function(options2) {
  options2 = options2 || {};
  var readStream = new PassThrough$1(options2);
  readStream.start = options2.start || 0;
  readStream.endOffset = options2.end;
  readStream.pos = readStream.endOffset || this.buffer.length;
  var entireSlice = this.buffer.slice(readStream.start, readStream.pos);
  var maxChunkSize = 65536;
  var offset = 0;
  while (true) {
    var nextOffset = offset + maxChunkSize;
    if (nextOffset >= entireSlice.length) {
      if (offset < entireSlice.length) {
        readStream.write(entireSlice.slice(offset, entireSlice.length));
      }
      break;
    }
    readStream.write(entireSlice.slice(offset, nextOffset));
    offset = nextOffset;
  }
  readStream.end();
  return readStream;
};
BufferSlicer.prototype.ref = function() {
  this.refCount += 1;
};
BufferSlicer.prototype.unref = function() {
  this.refCount -= 1;
  if (this.refCount < 0) {
    throw new Error("invalid unref");
  }
};
var crc32_1;
var hasRequiredCrc32;
function requireCrc32() {
  if (hasRequiredCrc32) return crc32_1;
  hasRequiredCrc32 = 1;
  const CRC_TABLE = new Int32Array([
    0,
    1996959894,
    3993919788,
    2567524794,
    124634137,
    1886057615,
    3915621685,
    2657392035,
    249268274,
    2044508324,
    3772115230,
    2547177864,
    162941995,
    2125561021,
    3887607047,
    2428444049,
    498536548,
    1789927666,
    4089016648,
    2227061214,
    450548861,
    1843258603,
    4107580753,
    2211677639,
    325883990,
    1684777152,
    4251122042,
    2321926636,
    335633487,
    1661365465,
    4195302755,
    2366115317,
    997073096,
    1281953886,
    3579855332,
    2724688242,
    1006888145,
    1258607687,
    3524101629,
    2768942443,
    901097722,
    1119000684,
    3686517206,
    2898065728,
    853044451,
    1172266101,
    3705015759,
    2882616665,
    651767980,
    1373503546,
    3369554304,
    3218104598,
    565507253,
    1454621731,
    3485111705,
    3099436303,
    671266974,
    1594198024,
    3322730930,
    2970347812,
    795835527,
    1483230225,
    3244367275,
    3060149565,
    1994146192,
    31158534,
    2563907772,
    4023717930,
    1907459465,
    112637215,
    2680153253,
    3904427059,
    2013776290,
    251722036,
    2517215374,
    3775830040,
    2137656763,
    141376813,
    2439277719,
    3865271297,
    1802195444,
    476864866,
    2238001368,
    4066508878,
    1812370925,
    453092731,
    2181625025,
    4111451223,
    1706088902,
    314042704,
    2344532202,
    4240017532,
    1658658271,
    366619977,
    2362670323,
    4224994405,
    1303535960,
    984961486,
    2747007092,
    3569037538,
    1256170817,
    1037604311,
    2765210733,
    3554079995,
    1131014506,
    879679996,
    2909243462,
    3663771856,
    1141124467,
    855842277,
    2852801631,
    3708648649,
    1342533948,
    654459306,
    3188396048,
    3373015174,
    1466479909,
    544179635,
    3110523913,
    3462522015,
    1591671054,
    702138776,
    2966460450,
    3352799412,
    1504918807,
    783551873,
    3082640443,
    3233442989,
    3988292384,
    2596254646,
    62317068,
    1957810842,
    3939845945,
    2647816111,
    81470997,
    1943803523,
    3814918930,
    2489596804,
    225274430,
    2053790376,
    3826175755,
    2466906013,
    167816743,
    2097651377,
    4027552580,
    2265490386,
    503444072,
    1762050814,
    4150417245,
    2154129355,
    426522225,
    1852507879,
    4275313526,
    2312317920,
    282753626,
    1742555852,
    4189708143,
    2394877945,
    397917763,
    1622183637,
    3604390888,
    2714866558,
    953729732,
    1340076626,
    3518719985,
    2797360999,
    1068828381,
    1219638859,
    3624741850,
    2936675148,
    906185462,
    1090812512,
    3747672003,
    2825379669,
    829329135,
    1181335161,
    3412177804,
    3160834842,
    628085408,
    1382605366,
    3423369109,
    3138078467,
    570562233,
    1426400815,
    3317316542,
    2998733608,
    733239954,
    1555261956,
    3268935591,
    3050360625,
    752459403,
    1541320221,
    2607071920,
    3965973030,
    1969922972,
    40735498,
    2617837225,
    3943577151,
    1913087877,
    83908371,
    2512341634,
    3803740692,
    2075208622,
    213261112,
    2463272603,
    3855990285,
    2094854071,
    198958881,
    2262029012,
    4057260610,
    1759359992,
    534414190,
    2176718541,
    4139329115,
    1873836001,
    414664567,
    2282248934,
    4279200368,
    1711684554,
    285281116,
    2405801727,
    4167216745,
    1634467795,
    376229701,
    2685067896,
    3608007406,
    1308918612,
    956543938,
    2808555105,
    3495958263,
    1231636301,
    1047427035,
    2932959818,
    3654703836,
    1088359270,
    936918e3,
    2847714899,
    3736837829,
    1202900863,
    817233897,
    3183342108,
    3401237130,
    1404277552,
    615818150,
    3134207493,
    3453421203,
    1423857449,
    601450431,
    3009837614,
    3294710456,
    1567103746,
    711928724,
    3020668471,
    3272380065,
    1510334235,
    755167117
  ]);
  function crc322(buf) {
    let crc = -1;
    for (let x of buf) {
      crc = CRC_TABLE[(crc ^ x) & 255] ^ crc >>> 8;
    }
    return (crc ^ -1) >>> 0;
  }
  crc32_1 = crc322;
  return crc32_1;
}
var fs = require$$0;
var zlib = require$$1$1;
var fd_slicer = fdSlicer;
var util = require$$1;
var EventEmitter = require$$4.EventEmitter;
var Transform = require$$5.Transform;
var PassThrough = require$$5.PassThrough;
var Writable = require$$5.Writable;
const crc32 = typeof zlib.crc32 === "function" ? zlib.crc32 : requireCrc32();
yauzl.open = open;
yauzl.fromFd = fromFd;
yauzl.fromBuffer = fromBuffer;
yauzl.fromRandomAccessReader = fromRandomAccessReader;
yauzl.openPromise = openPromise;
yauzl.fromFdPromise = fromFdPromise;
yauzl.fromBufferPromise = fromBufferPromise;
yauzl.fromRandomAccessReaderPromise = fromRandomAccessReaderPromise;
yauzl.dosDateTimeToDate = dosDateTimeToDate;
yauzl.getFileNameLowLevel = getFileNameLowLevel;
yauzl.validateFileName = validateFileName;
yauzl.parseExtraFields = parseExtraFields;
yauzl.ZipFile = ZipFile;
yauzl.Entry = Entry;
yauzl.LocalFileHeader = LocalFileHeader;
yauzl.RandomAccessReader = RandomAccessReader;
function openPromise(path2, options2) {
  return new Promise((resolve, reject) => {
    open(path2, { ...options2, lazyEntries: true }, function(err, zipfile) {
      if (err) return reject(err);
      resolve(zipfile);
    });
  });
}
function fromFdPromise(fd, options2) {
  return new Promise((resolve, reject) => {
    fromFd(fd, { ...options2, lazyEntries: true }, function(err, zipfile) {
      if (err) return reject(err);
      resolve(zipfile);
    });
  });
}
function fromBufferPromise(buffer, options2) {
  return new Promise((resolve, reject) => {
    fromBuffer(buffer, { ...options2, lazyEntries: true }, function(err, zipfile) {
      if (err) return reject(err);
      resolve(zipfile);
    });
  });
}
function fromRandomAccessReaderPromise(reader, totalSize, options2) {
  return new Promise((resolve, reject) => {
    fromRandomAccessReader(reader, totalSize, { ...options2, lazyEntries: true }, function(err, zipfile) {
      if (err) return reject(err);
      resolve(zipfile);
    });
  });
}
function open(path2, options2, callback) {
  if (typeof options2 === "function") {
    callback = options2;
    options2 = null;
  }
  if (options2 == null) options2 = {};
  if (options2.autoClose == null) options2.autoClose = true;
  if (options2.lazyEntries == null) options2.lazyEntries = false;
  if (options2.decodeStrings == null) options2.decodeStrings = true;
  if (options2.validateEntrySizes == null) options2.validateEntrySizes = true;
  if (options2.strictFileNames == null) options2.strictFileNames = false;
  if (callback == null) callback = defaultCallback;
  fs.open(path2, "r", function(err, fd) {
    if (err) return callback(err);
    fromFd(fd, options2, function(err2, zipfile) {
      if (err2) fs.close(fd, defaultCallback);
      callback(err2, zipfile);
    });
  });
}
function fromFd(fd, options2, callback) {
  if (typeof options2 === "function") {
    callback = options2;
    options2 = null;
  }
  if (options2 == null) options2 = {};
  if (options2.autoClose == null) options2.autoClose = false;
  if (options2.lazyEntries == null) options2.lazyEntries = false;
  if (options2.decodeStrings == null) options2.decodeStrings = true;
  if (options2.validateEntrySizes == null) options2.validateEntrySizes = true;
  if (options2.strictFileNames == null) options2.strictFileNames = false;
  if (callback == null) callback = defaultCallback;
  fs.fstat(fd, function(err, stats) {
    if (err) return callback(err);
    var reader = new fd_slicer.FdSlicer(fd);
    fromRandomAccessReader(reader, stats.size, options2, callback);
  });
}
function fromBuffer(buffer, options2, callback) {
  if (typeof options2 === "function") {
    callback = options2;
    options2 = null;
  }
  if (options2 == null) options2 = {};
  options2.autoClose = false;
  if (options2.lazyEntries == null) options2.lazyEntries = false;
  if (options2.decodeStrings == null) options2.decodeStrings = true;
  if (options2.validateEntrySizes == null) options2.validateEntrySizes = true;
  if (options2.strictFileNames == null) options2.strictFileNames = false;
  var reader = new fd_slicer.BufferSlicer(buffer);
  fromRandomAccessReader(reader, buffer.length, options2, callback);
}
function fromRandomAccessReader(reader, totalSize, options2, callback) {
  if (typeof options2 === "function") {
    callback = options2;
    options2 = null;
  }
  if (options2 == null) options2 = {};
  if (options2.autoClose == null) options2.autoClose = true;
  if (options2.lazyEntries == null) options2.lazyEntries = false;
  if (options2.decodeStrings == null) options2.decodeStrings = true;
  var decodeStrings = !!options2.decodeStrings;
  if (options2.validateEntrySizes == null) options2.validateEntrySizes = true;
  if (options2.strictFileNames == null) options2.strictFileNames = false;
  if (callback == null) callback = defaultCallback;
  if (typeof totalSize !== "number") throw new Error("expected totalSize parameter to be a number");
  if (totalSize > Number.MAX_SAFE_INTEGER) {
    throw new Error("zip file too large. only file sizes up to 2^52 are supported due to JavaScript's Number type being an IEEE 754 double.");
  }
  reader.ref();
  var eocdrWithoutCommentSize = 22;
  var zip64EocdlSize = 20;
  var maxCommentSize = 65535;
  var bufferSize = Math.min(zip64EocdlSize + eocdrWithoutCommentSize + maxCommentSize, totalSize);
  var buffer = newBuffer(bufferSize);
  var bufferReadStart = totalSize - buffer.length;
  readAndAssertNoEof(reader, buffer, 0, bufferSize, bufferReadStart, function(err) {
    if (err) return callback(err);
    for (var i = bufferSize - eocdrWithoutCommentSize; i >= 0; i -= 1) {
      if (buffer.readUInt32LE(i) !== 101010256) continue;
      var eocdrBuffer = buffer.subarray(i);
      var diskNumber = eocdrBuffer.readUInt16LE(4);
      var entryCount = eocdrBuffer.readUInt16LE(10);
      var centralDirectoryOffset = eocdrBuffer.readUInt32LE(16);
      var commentLength = eocdrBuffer.readUInt16LE(20);
      var expectedCommentLength = eocdrBuffer.length - eocdrWithoutCommentSize;
      if (commentLength !== expectedCommentLength) {
        return callback(new Error("Invalid comment length. Expected: " + expectedCommentLength + ". Found: " + commentLength + ". Are there extra bytes at the end of the file? Or is the end of central dir signature `PK☺☻` in the comment?"));
      }
      var comment = decodeStrings ? decodeBuffer(eocdrBuffer.subarray(22), false) : eocdrBuffer.subarray(22);
      if (i - zip64EocdlSize >= 0 && buffer.readUInt32LE(i - zip64EocdlSize) === 117853008) {
        var zip64EocdlBuffer = buffer.subarray(i - zip64EocdlSize, i - zip64EocdlSize + zip64EocdlSize);
        var zip64EocdrOffset = readUInt64LE(zip64EocdlBuffer, 8);
        var zip64EocdrBuffer = newBuffer(56);
        return readAndAssertNoEof(reader, zip64EocdrBuffer, 0, zip64EocdrBuffer.length, zip64EocdrOffset, function(err2) {
          if (err2) return callback(err2);
          if (zip64EocdrBuffer.readUInt32LE(0) !== 101075792) {
            return callback(new Error("invalid zip64 end of central directory record signature"));
          }
          diskNumber = zip64EocdrBuffer.readUInt32LE(16);
          if (diskNumber !== 0) {
            return callback(new Error("multi-disk zip files are not supported: found disk number: " + diskNumber));
          }
          entryCount = readUInt64LE(zip64EocdrBuffer, 32);
          centralDirectoryOffset = readUInt64LE(zip64EocdrBuffer, 48);
          return callback(null, new ZipFile(reader, centralDirectoryOffset, totalSize, entryCount, comment, options2.autoClose, options2.lazyEntries, decodeStrings, options2.validateEntrySizes, options2.strictFileNames));
        });
      }
      if (diskNumber !== 0) {
        return callback(new Error("multi-disk zip files are not supported: found disk number: " + diskNumber));
      }
      return callback(null, new ZipFile(reader, centralDirectoryOffset, totalSize, entryCount, comment, options2.autoClose, options2.lazyEntries, decodeStrings, options2.validateEntrySizes, options2.strictFileNames));
    }
    callback(new Error("End of central directory record signature not found. Either not a zip file, or file is truncated."));
  });
}
util.inherits(ZipFile, EventEmitter);
function ZipFile(reader, centralDirectoryOffset, fileSize, entryCount, comment, autoClose, lazyEntries, decodeStrings, validateEntrySizes, strictFileNames) {
  var self = this;
  EventEmitter.call(self);
  self.reader = reader;
  self.reader.on("error", function(err) {
    emitError(self, err);
  });
  self.reader.once("close", function() {
    self.emit("close");
  });
  self.readEntryCursor = centralDirectoryOffset;
  self.fileSize = fileSize;
  self.entryCount = entryCount;
  self.comment = comment;
  self.entriesRead = 0;
  self.autoClose = !!autoClose;
  self.lazyEntries = !!lazyEntries;
  self.decodeStrings = !!decodeStrings;
  self.validateEntrySizes = !!validateEntrySizes;
  self.strictFileNames = !!strictFileNames;
  self.isOpen = true;
  self.emittedError = false;
  self.hasEachEntryBeenCalled = false;
  if (!self.lazyEntries) self._readEntry();
}
ZipFile.prototype.close = function() {
  if (!this.isOpen) return;
  this.isOpen = false;
  this.reader.unref();
};
function emitErrorAndAutoClose(self, err) {
  if (self.autoClose) self.close();
  emitError(self, err);
}
function emitError(self, err) {
  if (self.emittedError) return;
  self.emittedError = true;
  self.emit("error", err);
}
ZipFile.prototype.readEntry = function() {
  if (!this.lazyEntries) throw new Error("readEntry() called without lazyEntries:true");
  this._readEntry();
};
ZipFile.prototype._readEntry = function() {
  var self = this;
  if (self.entryCount === self.entriesRead) {
    setImmediate(function() {
      if (self.autoClose) self.close();
      if (self.emittedError) return;
      self.emit("end");
    });
    return;
  }
  if (self.emittedError) return;
  var buffer = newBuffer(46);
  readAndAssertNoEof(self.reader, buffer, 0, buffer.length, self.readEntryCursor, function(err) {
    if (err) return emitErrorAndAutoClose(self, err);
    if (self.emittedError) return;
    var entry = new Entry();
    var signature = buffer.readUInt32LE(0);
    if (signature !== 33639248) return emitErrorAndAutoClose(self, new Error("invalid central directory file header signature: 0x" + signature.toString(16)));
    entry.versionMadeBy = buffer.readUInt16LE(4);
    entry.versionNeededToExtract = buffer.readUInt16LE(6);
    entry.generalPurposeBitFlag = buffer.readUInt16LE(8);
    entry.compressionMethod = buffer.readUInt16LE(10);
    entry.lastModFileTime = buffer.readUInt16LE(12);
    entry.lastModFileDate = buffer.readUInt16LE(14);
    entry.crc32 = buffer.readUInt32LE(16);
    entry.compressedSize = buffer.readUInt32LE(20);
    entry.uncompressedSize = buffer.readUInt32LE(24);
    entry.fileNameLength = buffer.readUInt16LE(28);
    entry.extraFieldLength = buffer.readUInt16LE(30);
    entry.fileCommentLength = buffer.readUInt16LE(32);
    entry.internalFileAttributes = buffer.readUInt16LE(36);
    entry.externalFileAttributes = buffer.readUInt32LE(38);
    entry.relativeOffsetOfLocalHeader = buffer.readUInt32LE(42);
    if (entry.generalPurposeBitFlag & 64) return emitErrorAndAutoClose(self, new Error("strong encryption is not supported"));
    self.readEntryCursor += 46;
    buffer = newBuffer(entry.fileNameLength + entry.extraFieldLength + entry.fileCommentLength);
    readAndAssertNoEof(self.reader, buffer, 0, buffer.length, self.readEntryCursor, function(err2) {
      if (err2) return emitErrorAndAutoClose(self, err2);
      if (self.emittedError) return;
      entry.fileNameRaw = buffer.subarray(0, entry.fileNameLength);
      var fileCommentStart = entry.fileNameLength + entry.extraFieldLength;
      entry.extraFieldRaw = buffer.subarray(entry.fileNameLength, fileCommentStart);
      entry.fileCommentRaw = buffer.subarray(fileCommentStart, fileCommentStart + entry.fileCommentLength);
      try {
        entry.extraFields = parseExtraFields(entry.extraFieldRaw);
      } catch (err3) {
        return emitErrorAndAutoClose(self, err3);
      }
      if (self.decodeStrings) {
        var isUtf8 = (entry.generalPurposeBitFlag & 2048) !== 0;
        entry.fileComment = decodeBuffer(entry.fileCommentRaw, isUtf8);
        entry.fileName = getFileNameLowLevel(entry.generalPurposeBitFlag, entry.fileNameRaw, entry.extraFields, self.strictFileNames);
        var errorMessage = validateFileName(entry.fileName);
        if (errorMessage != null) return emitErrorAndAutoClose(self, new Error(errorMessage));
      } else {
        entry.fileComment = entry.fileCommentRaw;
        entry.fileName = entry.fileNameRaw;
      }
      entry.comment = entry.fileComment;
      self.readEntryCursor += buffer.length;
      self.entriesRead += 1;
      for (var i = 0; i < entry.extraFields.length; i++) {
        var extraField = entry.extraFields[i];
        if (extraField.id !== 1) continue;
        var zip64EiefBuffer = extraField.data;
        var index = 0;
        if (entry.uncompressedSize === 4294967295) {
          if (index + 8 > zip64EiefBuffer.length) {
            return emitErrorAndAutoClose(self, new Error("zip64 extended information extra field does not include uncompressed size"));
          }
          entry.uncompressedSize = readUInt64LE(zip64EiefBuffer, index);
          index += 8;
        }
        if (entry.compressedSize === 4294967295) {
          if (index + 8 > zip64EiefBuffer.length) {
            return emitErrorAndAutoClose(self, new Error("zip64 extended information extra field does not include compressed size"));
          }
          entry.compressedSize = readUInt64LE(zip64EiefBuffer, index);
          index += 8;
        }
        if (entry.relativeOffsetOfLocalHeader === 4294967295) {
          if (index + 8 > zip64EiefBuffer.length) {
            return emitErrorAndAutoClose(self, new Error("zip64 extended information extra field does not include relative header offset"));
          }
          entry.relativeOffsetOfLocalHeader = readUInt64LE(zip64EiefBuffer, index);
          index += 8;
        }
        break;
      }
      if (self.validateEntrySizes && entry.compressionMethod === 0) {
        var expectedCompressedSize = entry.uncompressedSize;
        if (entry.isEncrypted()) {
          expectedCompressedSize += 12;
        }
        if (entry.compressedSize !== expectedCompressedSize) {
          var msg = "compressed/uncompressed size mismatch for stored file: " + entry.compressedSize + " != " + entry.uncompressedSize;
          return emitErrorAndAutoClose(self, new Error(msg));
        }
      }
      self.emit("entry", entry);
      if (!self.lazyEntries) self._readEntry();
    });
  });
};
ZipFile.prototype.eachEntry = function() {
  const self = this;
  if (!self.lazyEntries) throw new Error("eachEntry() requires lazyEntries: true");
  if (self.hasEachEntryBeenCalled) throw new Error("eachEntry() must only be called once per ZipFile");
  self.hasEachEntryBeenCalled = true;
  let pendingResolveReject = null;
  self.on("entry", onEntry);
  self.on("end", onEnd);
  self.on("error", onError);
  function cleanup() {
    self.removeListener("entry", onEntry);
    self.removeListener("end", onEnd);
    self.removeListener("error", onError);
    if (self.autoClose) self.close();
  }
  function onEntry(entry) {
    let { resolve } = pendingResolveReject;
    pendingResolveReject = null;
    resolve({ value: entry });
  }
  function onEnd() {
    let { resolve } = pendingResolveReject;
    pendingResolveReject = null;
    cleanup();
    resolve({ done: true });
  }
  function onError(err) {
    let { reject } = pendingResolveReject;
    pendingResolveReject = null;
    cleanup();
    reject(err);
  }
  return {
    [Symbol.asyncIterator]() {
      return this;
    },
    next() {
      const promise = new Promise((resolve, reject) => {
        if (pendingResolveReject != null) throw new Error("next() called before previous Promise was resolved.");
        pendingResolveReject = { resolve, reject };
      });
      self.readEntry();
      return promise;
    },
    return(value) {
      cleanup();
      return Promise.resolve({ done: true, value });
    },
    throw(value) {
      cleanup();
      return Promise.reject(value);
    }
  };
};
ZipFile.prototype.openReadStream = function(entry, options2, callback) {
  var self = this;
  var relativeStart = 0;
  var relativeEnd = entry.compressedSize;
  if (callback == null) {
    callback = options2;
    options2 = null;
  }
  if (options2 == null) {
    options2 = {};
  } else {
    if (options2.decodeFileData === false) {
      if (options2.decrypt != null) {
        throw new Error("cannot use options.decrypt when options.decodeFileData === false");
      }
      if (options2.decompress != null) {
        throw new Error("cannot use options.decompress when options.decodeFileData === false");
      }
    } else {
      if (options2.decrypt != null) {
        if (!entry.isEncrypted()) {
          throw new Error("options.decrypt can only be specified for encrypted entries. See also option decodeFileData.");
        }
        if (options2.decrypt !== false) throw new Error("invalid options.decrypt value: " + options2.decrypt);
        if (entry.isCompressed()) {
          if (options2.decompress !== false) throw new Error("entry is encrypted and compressed, and options.decompress !== false. See also option decodeFileData.");
        }
      }
      if (options2.decompress != null) {
        if (!entry.isCompressed()) {
          throw new Error("options.decompress can only be specified for compressed entries. See also option decodeFileData.");
        }
        if (!(options2.decompress === false || options2.decompress === true)) {
          throw new Error("invalid options.decompress value: " + options2.decompress);
        }
        decompress = options2.decompress;
      }
    }
    if (options2.start != null) {
      relativeStart = options2.start;
      if (relativeStart < 0) throw new Error("options.start < 0");
      if (relativeStart > entry.compressedSize) throw new Error("options.start > entry.compressedSize");
    }
    if (options2.end != null) {
      relativeEnd = options2.end;
      if (relativeEnd < 0) throw new Error("options.end < 0");
      if (relativeEnd > entry.compressedSize) throw new Error("options.end > entry.compressedSize");
      if (relativeEnd < relativeStart) throw new Error("options.end < options.start");
    }
  }
  var rawMode = options2.decodeFileData === false || // Explicitly requested raw.
  (entry.compressionMethod === 0 || // Naturally without compression.
  entry.compressionMethod === 8 && options2.decompress === false) && (!entry.isEncrypted() || // Naturally without encryption.
  options2.decrypt === false);
  if (options2.start != null || options2.end != null) {
    if (!rawMode) throw new Error("start/end range require options.decodeFileData === false for non-trivial encoded entries.");
  }
  if (!self.isOpen) return callback(new Error("closed"));
  if (entry.isEncrypted() && !rawMode) {
    if (options2.decrypt !== false) return callback(new Error("entry is encrypted, and options.decodeFileData !== false"));
  }
  var decompress;
  if (rawMode) {
    decompress = false;
  } else if (entry.compressionMethod === 8) {
    decompress = options2.decodeFileData !== true;
  } else {
    return callback(new Error("unsupported compression method: " + entry.compressionMethod));
  }
  self.readLocalFileHeader(entry, { minimal: true }, function(err, localFileHeader) {
    if (err) return callback(err);
    self.openReadStreamLowLevel(
      localFileHeader.fileDataStart,
      entry.compressedSize,
      relativeStart,
      relativeEnd,
      decompress,
      entry.uncompressedSize,
      callback
    );
  });
};
ZipFile.prototype.openReadStreamLowLevel = function(fileDataStart, compressedSize, relativeStart, relativeEnd, decompress, uncompressedSize, callback) {
  var self = this;
  var readStream = self.reader.createReadStream({
    start: fileDataStart + relativeStart,
    end: fileDataStart + relativeEnd
  });
  var endpointStream = readStream;
  if (decompress) {
    var destroyed = false;
    var inflateFilter = zlib.createInflateRaw();
    readStream.on("error", function(err) {
      setImmediate(function() {
        if (!destroyed) inflateFilter.emit("error", err);
      });
    });
    readStream.pipe(inflateFilter);
    if (self.validateEntrySizes) {
      endpointStream = new AssertByteCountStream(uncompressedSize);
      inflateFilter.on("error", function(err) {
        setImmediate(function() {
          if (!destroyed) endpointStream.emit("error", err);
        });
      });
      inflateFilter.pipe(endpointStream);
    } else {
      endpointStream = inflateFilter;
    }
    installDestroyFn(endpointStream, function() {
      destroyed = true;
      if (inflateFilter !== endpointStream) inflateFilter.unpipe(endpointStream);
      readStream.unpipe(inflateFilter);
      readStream.destroy();
    });
  }
  callback(null, endpointStream);
};
ZipFile.prototype.readLocalFileHeader = function(entry, options2, callback) {
  var self = this;
  if (callback == null) {
    callback = options2;
    options2 = null;
  }
  if (options2 == null) options2 = {};
  self.reader.ref();
  var buffer = newBuffer(30);
  readAndAssertNoEof(self.reader, buffer, 0, buffer.length, entry.relativeOffsetOfLocalHeader, function(err) {
    try {
      if (err) return callback(err);
      var signature = buffer.readUInt32LE(0);
      if (signature !== 67324752) {
        return callback(new Error("invalid local file header signature: 0x" + signature.toString(16)));
      }
      var fileNameLength = buffer.readUInt16LE(26);
      var extraFieldLength = buffer.readUInt16LE(28);
      var fileDataStart = entry.relativeOffsetOfLocalHeader + 30 + fileNameLength + extraFieldLength;
      if (fileDataStart + entry.compressedSize > self.fileSize) {
        return callback(new Error("file data overflows file bounds: " + fileDataStart + " + " + entry.compressedSize + " > " + self.fileSize));
      }
      if (options2.minimal) {
        return callback(null, { fileDataStart });
      }
      var localFileHeader = new LocalFileHeader();
      localFileHeader.fileDataStart = fileDataStart;
      localFileHeader.versionNeededToExtract = buffer.readUInt16LE(4);
      localFileHeader.generalPurposeBitFlag = buffer.readUInt16LE(6);
      localFileHeader.compressionMethod = buffer.readUInt16LE(8);
      localFileHeader.lastModFileTime = buffer.readUInt16LE(10);
      localFileHeader.lastModFileDate = buffer.readUInt16LE(12);
      localFileHeader.crc32 = buffer.readUInt32LE(14);
      localFileHeader.compressedSize = buffer.readUInt32LE(18);
      localFileHeader.uncompressedSize = buffer.readUInt32LE(22);
      localFileHeader.fileNameLength = fileNameLength;
      localFileHeader.extraFieldLength = extraFieldLength;
      buffer = newBuffer(fileNameLength + extraFieldLength);
      self.reader.ref();
      readAndAssertNoEof(self.reader, buffer, 0, buffer.length, entry.relativeOffsetOfLocalHeader + 30, function(err2) {
        try {
          if (err2) return callback(err2);
          localFileHeader.fileName = buffer.subarray(0, fileNameLength);
          localFileHeader.extraField = buffer.subarray(fileNameLength);
          return callback(null, localFileHeader);
        } finally {
          self.reader.unref();
        }
      });
    } finally {
      self.reader.unref();
    }
  });
};
ZipFile.prototype.openReadStreamPromise = function(entry, options2) {
  return new Promise((resolve, reject) => {
    this.openReadStream(entry, options2, function(err, readStream) {
      if (err) return reject(err);
      resolve(readStream);
    });
  });
};
ZipFile.prototype.openReadStreamLowLevelPromise = function(fileDataStart, compressedSize, relativeStart, relativeEnd, decompress, uncompressedSize) {
  return new Promise((resolve, reject) => {
    this.openReadStream(fileDataStart, compressedSize, relativeStart, relativeEnd, decompress, uncompressedSize, function(err, readStream) {
      if (err) return reject(err);
      resolve(readStream);
    });
  });
};
ZipFile.prototype.readLocalFileHeaderPromise = function(entry, options2) {
  return new Promise((resolve, reject) => {
    this.readLocalFileHeader(entry, options2, function(err, localFileHeader) {
      if (err) return reject(err);
      resolve(localFileHeader);
    });
  });
};
function Entry() {
}
Entry.prototype.getLastModDate = function(options2) {
  if (options2 == null) options2 = {};
  if (!options2.forceDosFormat) {
    for (var i = 0; i < this.extraFields.length; i++) {
      var extraField = this.extraFields[i];
      if (extraField.id === 21589) {
        var data = extraField.data;
        if (data.length < 5) continue;
        var flags = data[0];
        var HAS_MTIME = 1;
        if (!(flags & HAS_MTIME)) continue;
        var posixTimestamp = data.readInt32LE(1);
        return new Date(posixTimestamp * 1e3);
      } else if (extraField.id === 10) {
        var data = extraField.data;
        if (data.length !== 32) continue;
        if (data.readUInt16LE(4) !== 1) continue;
        if (data.readUInt16LE(6) !== 24) continue;
        var hundredNanoSecondsSince1601 = data.readUInt32LE(8) + 4294967296 * data.readInt32LE(12);
        var millisecondsSince1970 = hundredNanoSecondsSince1601 / 1e4 - 116444736e5;
        return new Date(millisecondsSince1970);
      }
    }
  }
  return dosDateTimeToDate(this.lastModFileDate, this.lastModFileTime, options2.timezone);
};
Entry.prototype.canDecodeFileData = function() {
  return !this.isEncrypted() && (this.compressionMethod === 0 || this.compressionMethod === 8);
};
Entry.prototype.isEncrypted = function() {
  return (this.generalPurposeBitFlag & 1) !== 0;
};
Entry.prototype.isCompressed = function() {
  return this.compressionMethod === 8;
};
function LocalFileHeader() {
}
function dosDateTimeToDate(date, time, timezone) {
  var day = date & 31;
  var month = (date >> 5 & 15) - 1;
  var year = (date >> 9 & 127) + 1980;
  var millisecond = 0;
  var second = (time & 31) * 2;
  var minute = time >> 5 & 63;
  var hour = time >> 11 & 31;
  if (timezone == null || timezone === "local") {
    return new Date(year, month, day, hour, minute, second, millisecond);
  } else if (timezone === "UTC") {
    return new Date(Date.UTC(year, month, day, hour, minute, second, millisecond));
  } else {
    throw new Error("unrecognized options.timezone: " + options.timezone);
  }
}
function getFileNameLowLevel(generalPurposeBitFlag, fileNameBuffer, extraFields, strictFileNames) {
  var fileName = null;
  for (var i = 0; i < extraFields.length; i++) {
    var extraField = extraFields[i];
    if (extraField.id === 28789) {
      if (extraField.data.length < 6) {
        continue;
      }
      if (extraField.data.readUInt8(0) !== 1) {
        continue;
      }
      var oldNameCrc32 = extraField.data.readUInt32LE(1);
      if (crc32(fileNameBuffer) !== oldNameCrc32) {
        continue;
      }
      fileName = decodeBuffer(extraField.data.subarray(5), true);
      break;
    }
  }
  if (fileName == null) {
    var isUtf8 = (generalPurposeBitFlag & 2048) !== 0;
    fileName = decodeBuffer(fileNameBuffer, isUtf8);
  }
  if (!strictFileNames) {
    fileName = fileName.replace(/\\/g, "/");
  }
  return fileName;
}
function validateFileName(fileName) {
  if (fileName.indexOf("\\") !== -1) {
    return "invalid characters in fileName: " + fileName;
  }
  if (/^[a-zA-Z]:/.test(fileName) || /^\//.test(fileName)) {
    return "absolute path: " + fileName;
  }
  if (fileName.split("/").indexOf("..") !== -1) {
    return "invalid relative path: " + fileName;
  }
  return null;
}
function parseExtraFields(extraFieldBuffer) {
  var extraFields = [];
  var i = 0;
  while (i < extraFieldBuffer.length - 3) {
    var headerId = extraFieldBuffer.readUInt16LE(i + 0);
    var dataSize = extraFieldBuffer.readUInt16LE(i + 2);
    var dataStart = i + 4;
    var dataEnd = dataStart + dataSize;
    if (dataEnd > extraFieldBuffer.length) throw new Error("extra field length exceeds extra field buffer size");
    var dataBuffer = extraFieldBuffer.subarray(dataStart, dataEnd);
    extraFields.push({
      id: headerId,
      data: dataBuffer
    });
    i = dataEnd;
  }
  return extraFields;
}
function readAndAssertNoEof(reader, buffer, offset, length, position, callback) {
  if (length === 0) {
    return setImmediate(function() {
      callback(null, newBuffer(0));
    });
  }
  reader.read(buffer, offset, length, position, function(err, bytesRead) {
    if (err) return callback(err);
    if (bytesRead < length) {
      return callback(new Error("unexpected EOF"));
    }
    callback();
  });
}
util.inherits(AssertByteCountStream, Transform);
function AssertByteCountStream(byteCount) {
  Transform.call(this);
  this.actualByteCount = 0;
  this.expectedByteCount = byteCount;
}
AssertByteCountStream.prototype._transform = function(chunk, encoding, cb) {
  this.actualByteCount += chunk.length;
  if (this.actualByteCount > this.expectedByteCount) {
    var msg = "too many bytes in the stream. expected " + this.expectedByteCount + ". got at least " + this.actualByteCount;
    return cb(new Error(msg));
  }
  cb(null, chunk);
};
AssertByteCountStream.prototype._flush = function(cb) {
  if (this.actualByteCount < this.expectedByteCount) {
    var msg = "not enough bytes in the stream. expected " + this.expectedByteCount + ". got only " + this.actualByteCount;
    return cb(new Error(msg));
  }
  cb();
};
util.inherits(RandomAccessReader, EventEmitter);
function RandomAccessReader() {
  EventEmitter.call(this);
  this.refCount = 0;
}
RandomAccessReader.prototype.ref = function() {
  this.refCount += 1;
};
RandomAccessReader.prototype.unref = function() {
  var self = this;
  self.refCount -= 1;
  if (self.refCount > 0) return;
  if (self.refCount < 0) throw new Error("invalid unref");
  self.close(onCloseDone);
  function onCloseDone(err) {
    if (err) return self.emit("error", err);
    self.emit("close");
  }
};
RandomAccessReader.prototype.createReadStream = function(options2) {
  if (options2 == null) options2 = {};
  var start = options2.start;
  var end = options2.end;
  if (start === end) {
    var emptyStream = new PassThrough();
    setImmediate(function() {
      emptyStream.end();
    });
    return emptyStream;
  }
  var stream2 = this._readStreamForRange(start, end);
  var destroyed = false;
  var refUnrefFilter = new RefUnrefFilter(this);
  stream2.on("error", function(err) {
    setImmediate(function() {
      if (!destroyed) refUnrefFilter.emit("error", err);
    });
  });
  installDestroyFn(refUnrefFilter, function() {
    stream2.unpipe(refUnrefFilter);
    refUnrefFilter.unref();
    stream2.destroy();
  });
  var byteCounter = new AssertByteCountStream(end - start);
  refUnrefFilter.on("error", function(err) {
    setImmediate(function() {
      if (!destroyed) byteCounter.emit("error", err);
    });
  });
  installDestroyFn(byteCounter, function() {
    destroyed = true;
    refUnrefFilter.unpipe(byteCounter);
    refUnrefFilter.destroy();
  });
  return stream2.pipe(refUnrefFilter).pipe(byteCounter);
};
RandomAccessReader.prototype._readStreamForRange = function(start, end) {
  throw new Error("not implemented");
};
RandomAccessReader.prototype.read = function(buffer, offset, length, position, callback) {
  var readStream = this.createReadStream({ start: position, end: position + length });
  var writeStream = new Writable();
  var written = 0;
  writeStream._write = function(chunk, encoding, cb) {
    chunk.copy(buffer, offset + written, 0, chunk.length);
    written += chunk.length;
    cb();
  };
  writeStream.on("finish", callback);
  readStream.on("error", function(error) {
    callback(error);
  });
  readStream.pipe(writeStream);
};
RandomAccessReader.prototype.close = function(callback) {
  setImmediate(callback);
};
util.inherits(RefUnrefFilter, PassThrough);
function RefUnrefFilter(context) {
  PassThrough.call(this);
  this.context = context;
  this.context.ref();
  this.unreffedYet = false;
}
RefUnrefFilter.prototype._flush = function(cb) {
  this.unref();
  cb();
};
RefUnrefFilter.prototype.unref = function(cb) {
  if (this.unreffedYet) return;
  this.unreffedYet = true;
  this.context.unref();
};
var cp437 = "\0☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼ !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~⌂ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ";
function decodeBuffer(buffer, isUtf8) {
  if (isUtf8) {
    return buffer.toString("utf8");
  } else {
    var result = "";
    for (var i = 0; i < buffer.length; i++) {
      result += cp437[buffer[i]];
    }
    return result;
  }
}
function readUInt64LE(buffer, offset) {
  var lower32 = buffer.readUInt32LE(offset);
  var upper32 = buffer.readUInt32LE(offset + 4);
  return upper32 * 4294967296 + lower32;
}
var newBuffer;
if (typeof Buffer.allocUnsafe === "function") {
  newBuffer = function(len) {
    return Buffer.allocUnsafe(len);
  };
} else {
  newBuffer = function(len) {
    return new Buffer(len);
  };
}
function installDestroyFn(stream2, fn) {
  if (typeof stream2.destroy === "function") {
    stream2._destroy = function(err, cb) {
      fn();
      if (cb != null) cb(err);
    };
  } else {
    stream2.destroy = fn;
  }
}
function defaultCallback(err) {
  if (err) throw err;
}
function isPathInsideExtractRoot(targetPath, extractRootPath) {
  const normalizedRoot = path.resolve(extractRootPath);
  const normalizedTarget = path.resolve(targetPath);
  if (process.platform === "win32") {
    const rootLower = normalizedRoot.toLowerCase();
    const targetLower = normalizedTarget.toLowerCase();
    if (targetLower === rootLower) {
      return true;
    }
    return targetLower.startsWith(`${rootLower}${path.sep}`);
  }
  if (normalizedTarget === normalizedRoot) {
    return true;
  }
  return normalizedTarget.startsWith(`${normalizedRoot}${path.sep}`);
}
function isAbsoluteZipEntryName(entryName) {
  if (path.isAbsolute(entryName)) {
    return true;
  }
  if (entryName.startsWith("/") || entryName.startsWith("\\")) {
    return true;
  }
  return /^[a-zA-Z]:[\\/]/.test(entryName);
}
function isZipDirectoryEntry(entryName) {
  return entryName.endsWith("/") || entryName.endsWith("\\");
}
function resolveSafeZipEntryPath(entryName, extractRoot) {
  if (!entryName.trim() || entryName.includes("\0")) {
    throw new ZipExtractionError("ZIP_PATH_TRAVERSAL", "The ZIP archive contains an invalid entry path.");
  }
  if (isAbsoluteZipEntryName(entryName)) {
    throw new ZipExtractionError(
      "ZIP_PATH_TRAVERSAL",
      "The ZIP archive contains an absolute path entry, which is not allowed."
    );
  }
  if (isZipDirectoryEntry(entryName)) {
    throw new ZipExtractionError(
      "ZIP_PATH_TRAVERSAL",
      "Directory entries must be skipped before resolving a ZIP file path."
    );
  }
  const posixPath = entryName.replace(/\\/g, "/");
  const segments = posixPath.split("/");
  if (segments.some((segment) => segment === "..")) {
    throw new ZipExtractionError(
      "ZIP_PATH_TRAVERSAL",
      "The ZIP archive contains a path traversal entry, which is not allowed."
    );
  }
  const targetPath = path.resolve(extractRoot, ...segments.filter((segment) => segment.length > 0));
  if (!isPathInsideExtractRoot(targetPath, extractRoot)) {
    throw new ZipExtractionError(
      "ZIP_PATH_TRAVERSAL",
      "The ZIP archive contains an entry that would extract outside the job temp directory."
    );
  }
  return targetPath;
}
function toZipRelativePath(extractRoot, absolutePath) {
  return path.relative(extractRoot, absolutePath).split(path.sep).join("/");
}
const ZIP_LOCAL_FILE_HEADER = Buffer.from([80, 75, 3, 4]);
const ZIP_EMPTY_ARCHIVE_HEADER = Buffer.from([80, 75, 5, 6]);
const ZIP_SPANNED_ARCHIVE_HEADER = Buffer.from([80, 75, 7, 8]);
function hasPngExtension(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return ALLOWED_EXTENSIONS.some((allowedExtension) => allowedExtension === extension);
}
function isZipSymlinkEntry(entry) {
  if (entry.externalFileAttributes === void 0) {
    return false;
  }
  const mode = entry.externalFileAttributes >>> 16 & 65535;
  return (mode & 61440) === 40960;
}
function openZipFile(zipPath) {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true, decodeStrings: true }, (error, zipFile) => {
      if (error || !zipFile) {
        reject(error ?? new Error("The ZIP archive could not be opened."));
        return;
      }
      resolve(zipFile);
    });
  });
}
function readZipEntryStream(zipFile, entry) {
  return new Promise((resolve, reject) => {
    zipFile.openReadStream(entry, (error, readStream) => {
      if (error || !readStream) {
        reject(error ?? new Error("The ZIP entry could not be read."));
        return;
      }
      resolve(readStream);
    });
  });
}
async function assertZipArchiveMagicBytes(zipPath) {
  const fileHandle = await open$1(zipPath, "r");
  try {
    const header = Buffer.alloc(4);
    await fileHandle.read(header, 0, 4, 0);
    const isRecognizedHeader = header.equals(ZIP_LOCAL_FILE_HEADER) || header.equals(ZIP_EMPTY_ARCHIVE_HEADER) || header.equals(ZIP_SPANNED_ARCHIVE_HEADER);
    if (!isRecognizedHeader) {
      throw new ZipExtractionError(
        "ZIP_INVALID_ARCHIVE",
        "The selected file does not appear to be a valid ZIP archive."
      );
    }
  } finally {
    await fileHandle.close();
  }
}
async function assertZipArchiveSize(zipPath) {
  const zipStats = await stat(zipPath);
  if (!zipStats.isFile()) {
    throw new ZipExtractionError("ZIP_INVALID_ARCHIVE", "The selected ZIP path is not a file.");
  }
  if (zipStats.size > MAX_ZIP_SIZE_BYTES) {
    throw new ZipExtractionError(
      "FILE_TOO_LARGE",
      "The selected ZIP file exceeds the 200 MB import limit."
    );
  }
  return zipStats.size;
}
function assertCompressionRatio(entry) {
  const compressedSize = entry.compressedSize;
  const uncompressedSize = entry.uncompressedSize;
  if (compressedSize === 0) {
    return;
  }
  if (uncompressedSize / compressedSize > MAX_ZIP_COMPRESSION_RATIO) {
    throw new ZipExtractionError(
      "ZIP_COMPRESSION_RATIO_EXCEEDED",
      "The ZIP archive exceeds the allowed compression ratio and cannot be extracted safely."
    );
  }
}
function assertExtractedByteBudget(currentExtractedBytes, entry) {
  const nextExtractedBytes = currentExtractedBytes + entry.uncompressedSize;
  if (nextExtractedBytes > MAX_EXTRACTED_BYTES) {
    throw new ZipExtractionError(
      "ZIP_EXTRACTED_SIZE_EXCEEDED",
      "The ZIP archive would exceed the 500 MB extracted size limit."
    );
  }
}
async function writeZipEntryToDisk(zipFile, entry, targetPath) {
  await mkdir(path.dirname(targetPath), { recursive: true });
  const readStream = await readZipEntryStream(zipFile, entry);
  const writeStream = createWriteStream(targetPath);
  await pipeline(readStream, writeStream);
}
function mapYauzlError(error) {
  if (error instanceof ZipExtractionError) {
    return error;
  }
  return new ZipExtractionError(
    "ZIP_CORRUPT",
    error instanceof Error ? error.message : "The ZIP archive is corrupt or unreadable."
  );
}
async function extractZipPngCandidates(options2) {
  const { extractRoot, onProgress, shouldCancel, zipPath } = options2;
  const normalizedZipPath = path.normalize(zipPath);
  const normalizedExtractRoot = path.resolve(extractRoot);
  await assertZipArchiveMagicBytes(normalizedZipPath);
  await assertZipArchiveSize(normalizedZipPath);
  await mkdir(normalizedExtractRoot, { recursive: true });
  const zipFile = await openZipFile(normalizedZipPath);
  return new Promise((resolve, reject) => {
    const result = {
      candidates: [],
      entriesScanned: 0,
      pngsDiscovered: 0,
      truncated: false
    };
    let extractedBytes = 0;
    let settled = false;
    const finish = (value) => {
      if (settled) {
        return;
      }
      settled = true;
      zipFile.close();
      value.candidates.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
      resolve(value);
    };
    const fail = (error) => {
      if (settled) {
        return;
      }
      settled = true;
      zipFile.close();
      reject(mapYauzlError(error));
    };
    const handleEntry = async (entry) => {
      try {
        if (shouldCancel()) {
          finish(result);
          return;
        }
        result.entriesScanned += 1;
        if (result.entriesScanned > MAX_ZIP_ENTRIES) {
          throw new ZipExtractionError(
            "ZIP_TOO_MANY_ENTRIES",
            "The ZIP archive exceeds the 500 entry scan limit."
          );
        }
        onProgress == null ? void 0 : onProgress({
          entriesScanned: result.entriesScanned,
          pngsDiscovered: result.pngsDiscovered
        });
        const entryName = entry.fileName;
        if (isZipSymlinkEntry(entry)) {
          throw new ZipExtractionError(
            "ZIP_SYMLINK_ENTRY",
            "The ZIP archive contains a symlink entry, which is not allowed."
          );
        }
        if (!isZipDirectoryEntry(entryName) && hasPngExtension(entryName)) {
          assertCompressionRatio(entry);
          assertExtractedByteBudget(extractedBytes, entry);
          const targetPath = resolveSafeZipEntryPath(entryName, normalizedExtractRoot);
          if (result.candidates.length >= MAX_BATCH_FILES) {
            result.truncated = true;
            result.pngsDiscovered += 1;
          } else {
            await writeZipEntryToDisk(zipFile, entry, targetPath);
            extractedBytes += entry.uncompressedSize;
            result.pngsDiscovered += 1;
            result.candidates.push({
              absolutePath: path.normalize(targetPath),
              fileName: path.basename(targetPath),
              relativePath: toZipRelativePath(normalizedExtractRoot, targetPath)
            });
          }
        }
        zipFile.readEntry();
      } catch (error) {
        fail(error);
      }
    };
    zipFile.on("entry", (entry) => {
      void handleEntry(entry);
    });
    zipFile.on("end", () => {
      finish(result);
    });
    zipFile.on("error", (error) => {
      fail(error);
    });
    zipFile.readEntry();
  });
}
async function runZipBatchDiscovery(jobId, webContents) {
  var _a;
  const emitDiscoveryProgress = createDiscoveryProgressEmitter(webContents);
  const zipPath = getBatchSessionZipPath(jobId);
  const files = [];
  let canceled = false;
  let truncated = false;
  let pngsDiscovered = 0;
  let lastExtractProgressKey = "";
  if (!zipPath) {
    throw new BatchDiscoveryFatalError(
      "INVALID_INPUT",
      "The batch session does not contain a selected ZIP file."
    );
  }
  emitDiscoveryProgress({
    jobId,
    phase: "discovering",
    fileIndex: 0,
    fileTotal: 0,
    currentFileName: "",
    status: "running",
    message: "Preparing ZIP extraction",
    counts: buildProgressCounts(files)
  });
  const jobTempDir = await createJobTempDir(jobId);
  const extractResult = await extractZipPngCandidates({
    zipPath,
    extractRoot: jobTempDir,
    shouldCancel: () => isBatchImportCancelRequested(jobId),
    onProgress: ({ entriesScanned, pngsDiscovered: discoveredCount }) => {
      const extractProgressKey = `${entriesScanned}|${discoveredCount}`;
      if (extractProgressKey === lastExtractProgressKey) {
        return;
      }
      lastExtractProgressKey = extractProgressKey;
      emitDiscoveryProgress({
        jobId,
        phase: "discovering",
        fileIndex: entriesScanned,
        fileTotal: 0,
        currentFileName: "",
        status: "running",
        message: `Extracting ZIP (${discoveredCount} PNG${discoveredCount === 1 ? "" : "s"} found)`,
        counts: buildProgressCounts(files)
      });
    }
  });
  if (isBatchImportCancelRequested(jobId)) {
    canceled = true;
  }
  truncated = extractResult.truncated;
  pngsDiscovered = extractResult.pngsDiscovered;
  const candidates = extractResult.candidates;
  const fileTotal = candidates.length;
  for (let index = 0; index < candidates.length; index += 1) {
    if (isBatchImportCancelRequested(jobId)) {
      canceled = true;
      break;
    }
    const candidate = candidates[index];
    try {
      const validation = await validatePngFile(candidate.absolutePath);
      registerBatchValidatedPath(jobId, candidate.absolutePath);
      files.push({
        filePath: candidate.absolutePath,
        displayName: validation.fileName,
        relativePath: candidate.relativePath,
        fileSizeBytes: validation.fileSizeBytes,
        sourceType: "zip",
        outcome: "validated",
        validation
      });
    } catch (error) {
      files.push({
        filePath: candidate.absolutePath,
        displayName: candidate.fileName,
        relativePath: candidate.relativePath,
        fileSizeBytes: 0,
        sourceType: "zip",
        outcome: "rejected",
        rejection: mapPngValidationFailureToRejection(candidate.absolutePath, error)
      });
    }
    emitDiscoveryProgress({
      jobId,
      phase: "validating",
      fileIndex: index + 1,
      fileTotal,
      currentFileName: candidate.fileName,
      status: canceled ? "cancelled" : ((_a = files.at(-1)) == null ? void 0 : _a.outcome) === "validated" ? "success" : "rejected",
      message: `Validated ${candidate.fileName}`,
      counts: buildProgressCounts(files)
    });
  }
  emitDiscoveryFinished(webContents, emitDiscoveryProgress, {
    canceled,
    fileTotal,
    files,
    jobId,
    pngsDiscovered,
    sourceType: "zip",
    truncated
  });
  return canceled;
}
function createTerminalGuard(jobId, webContents) {
  let terminalEventEmitted = false;
  return {
    async emitFatalError(error, cleanupZipTemp) {
      if (terminalEventEmitted) {
        return;
      }
      terminalEventEmitted = true;
      if (cleanupZipTemp) {
        try {
          await deleteJobTempDir(jobId);
        } catch {
        }
      }
      failBatchImportDiscovery(jobId);
      emitBatchJobError(webContents, error);
    }
  };
}
function mapDiscoveryError(jobId, sourceType, error) {
  if (error instanceof BatchDiscoveryFatalError) {
    return {
      event: {
        jobId,
        code: error.code,
        message: error.message
      },
      cleanupZipTemp: error.cleanupZipTemp
    };
  }
  if (error instanceof ZipExtractionError) {
    return {
      event: mapZipExtractionErrorToJobError(jobId, error),
      cleanupZipTemp: true
    };
  }
  const message = error instanceof Error ? error.message : "An unexpected error occurred during batch discovery.";
  return {
    event: {
      jobId,
      code: "INTERNAL_ERROR",
      message
    },
    cleanupZipTemp: sourceType === "zip"
  };
}
async function runSourceDiscovery(jobId, webContents, sourceType) {
  switch (sourceType) {
    case "multiple-png":
      return runMultiplePngBatchDiscovery(jobId, webContents);
    case "folder":
      return runFolderBatchDiscovery(jobId, webContents);
    case "zip":
      return runZipBatchDiscovery(jobId, webContents);
    default:
      throw new BatchDiscoveryFatalError(
        "INVALID_INPUT",
        "The batch import source type is not supported."
      );
  }
}
async function runBatchImportDiscovery(input) {
  const { jobId, sourceType, webContents } = input;
  const terminalGuard = createTerminalGuard(jobId, webContents);
  if (!markBatchImportSessionDiscovering(jobId)) {
    await terminalGuard.emitFatalError(
      {
        jobId,
        code: "INVALID_INPUT",
        message: "The batch import session is no longer ready for discovery."
      },
      false
    );
    return;
  }
  try {
    const canceled = await runSourceDiscovery(jobId, webContents, sourceType);
    completeBatchImportDiscovery(jobId, canceled);
  } catch (error) {
    const mapped = mapDiscoveryError(jobId, sourceType, error);
    await terminalGuard.emitFatalError(mapped.event, mapped.cleanupZipTemp);
  }
}
const BATCH_SOURCE_TYPES = /* @__PURE__ */ new Set(["multiple-png", "folder", "zip"]);
function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}
function validateStartBatchDiscoveryRequest(payload) {
  if (!payload || typeof payload !== "object") {
    return {
      error: importIpcFailure("INVALID_INPUT", "A batch discovery request object is required.")
    };
  }
  const request = payload;
  if (!isNonEmptyString(request.jobId)) {
    return {
      error: importIpcFailure("INVALID_INPUT", "A batch job ID is required.")
    };
  }
  if (!request.sourceType || !BATCH_SOURCE_TYPES.has(request.sourceType)) {
    return {
      error: importIpcFailure("INVALID_INPUT", "A valid batch source type is required.")
    };
  }
  return {
    request
  };
}
function validateCancelBatchImportJobRequest(payload) {
  if (!payload || typeof payload !== "object") {
    return {
      error: importIpcFailure("INVALID_INPUT", "A cancel batch job request object is required.")
    };
  }
  const request = payload;
  if (!isNonEmptyString(request.jobId)) {
    return {
      error: importIpcFailure("INVALID_INPUT", "A batch job ID is required.")
    };
  }
  return {
    request
  };
}
function validateFinishBatchImportJobRequest(payload) {
  if (!payload || typeof payload !== "object") {
    return {
      error: importIpcFailure("INVALID_INPUT", "A finish batch job request object is required.")
    };
  }
  const request = payload;
  if (!isNonEmptyString(request.jobId)) {
    return {
      error: importIpcFailure("INVALID_INPUT", "A batch job ID is required.")
    };
  }
  return {
    request
  };
}
function cancelBatchImportJob(request, webContentsId) {
  const canceled = requestBatchImportCancel(request.jobId, webContentsId);
  return {
    jobId: request.jobId,
    canceled
  };
}
async function finishBatchImportJob(request, webContentsId) {
  let tempDirDeleted = false;
  try {
    tempDirDeleted = await deleteJobTempDir(request.jobId);
  } catch {
    tempDirDeleted = false;
  }
  const sessionCleared = finishBatchImportSession(request.jobId, webContentsId);
  return {
    jobId: request.jobId,
    tempDirDeleted,
    sessionCleared
  };
}
const allowedValidationPaths = /* @__PURE__ */ new Set();
const validatedImportPaths = /* @__PURE__ */ new Set();
function clearImportFileSession() {
  allowedValidationPaths.clear();
  validatedImportPaths.clear();
}
function registerImportFilePath(filePath) {
  clearImportFileSession();
  allowedValidationPaths.add(path.normalize(filePath));
}
function markImportFileValidated(filePath) {
  validatedImportPaths.add(path.normalize(filePath));
}
function isRegisteredImportFilePath(filePath) {
  return allowedValidationPaths.has(path.normalize(filePath));
}
function isValidatedImportFilePath(filePath) {
  return validatedImportPaths.has(path.normalize(filePath));
}
function isSingleFileImportSessionActive() {
  return allowedValidationPaths.size > 0;
}
function getSingleFileSessionBlockedError() {
  return importIpcFailure(
    "SESSION_CONFLICT",
    "Finish or clear the current single PNG import before starting a batch import."
  );
}
function getBatchSessionBlockedError() {
  return importIpcFailure(
    "SESSION_CONFLICT",
    "Finish or cancel the active batch import before using single PNG import."
  );
}
function assertCanStartSingleFileImport() {
  if (hasActiveBatchImportSession()) {
    return getBatchSessionBlockedError();
  }
  return null;
}
function assertCanStartBatchImport() {
  if (isSingleFileImportSessionActive()) {
    return getSingleFileSessionBlockedError();
  }
  if (hasActiveBatchImportSession()) {
    return importIpcFailure(
      "SESSION_CONFLICT",
      "Finish or cancel the active batch import before starting another batch import."
    );
  }
  return null;
}
async function readBatchValidatedPngFileBytes(filePath) {
  const fileBuffer = await readFile(filePath);
  return {
    bytes: Uint8Array.from(fileBuffer),
    fileName: getFileName(filePath),
    filePath,
    fileSizeBytes: fileBuffer.length
  };
}
const THUMBNAIL_MAX_WIDTH_PX = 320;
const THUMBNAIL_MAX_HEIGHT_PX = 320;
const THUMBNAIL_WEBP_QUALITY = 80;
const PREVIEW_MAX_WIDTH_PX = 1280;
const PREVIEW_MAX_HEIGHT_PX = 1280;
const PREVIEW_WEBP_QUALITY = 85;
const DERIVATIVE_ALLOW_UPSCALE = false;
const DERIVATIVE_PRESERVE_ALPHA = true;
const DERIVATIVE_PROCESSING_CONCURRENCY = 1;
const MAX_DERIVATIVE_FILE_SIZE_BYTES = 10 * 1024 * 1024;
class DerivativeConcurrencyQueue {
  constructor() {
    __publicField(this, "activeCount", 0);
    __publicField(this, "waitQueue", []);
  }
  async run(task) {
    await this.acquire();
    try {
      return await task();
    } finally {
      this.release();
    }
  }
  acquire() {
    if (this.activeCount < DERIVATIVE_PROCESSING_CONCURRENCY) {
      this.activeCount += 1;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.waitQueue.push(() => {
        this.activeCount += 1;
        resolve();
      });
    });
  }
  release() {
    this.activeCount = Math.max(0, this.activeCount - 1);
    const next = this.waitQueue.shift();
    if (next) {
      next();
    }
  }
}
const derivativeConcurrencyQueue = new DerivativeConcurrencyQueue();
function isWebpMagicBytes(bytes) {
  if (bytes.byteLength < 12) {
    return false;
  }
  const riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  const webp = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
  return riff === "RIFF" && webp === "WEBP";
}
function isPngMagicBytes(bytes) {
  if (bytes.byteLength < PNG_MAGIC_BYTES.length) {
    return false;
  }
  return PNG_MAGIC_BYTES.every((byte, index) => bytes[index] === byte);
}
function validateDerivativeGenerationRequest(request) {
  if (!request || typeof request !== "object") {
    return {
      code: "INVALID_INPUT",
      message: "A derivative generation request is required."
    };
  }
  const { pngBytes, fileName, fileSizeBytes } = request;
  if (!(pngBytes instanceof Uint8Array) || pngBytes.byteLength === 0) {
    return {
      code: "INVALID_INPUT",
      message: "PNG bytes are required for derivative generation."
    };
  }
  if (typeof fileName !== "string" || fileName.trim().length === 0) {
    return {
      code: "INVALID_INPUT",
      message: "A source file name is required for derivative generation."
    };
  }
  if (typeof fileSizeBytes !== "number" || !Number.isFinite(fileSizeBytes) || fileSizeBytes <= 0) {
    return {
      code: "INVALID_INPUT",
      message: "A valid source file size is required for derivative generation."
    };
  }
  if (fileSizeBytes !== pngBytes.byteLength) {
    return {
      code: "INVALID_INPUT",
      message: "The reported PNG file size does not match the provided bytes."
    };
  }
  if (pngBytes.byteLength > MAX_SINGLE_PNG_SIZE_BYTES) {
    return {
      code: "FILE_TOO_LARGE",
      message: `The PNG file exceeds the maximum allowed size of ${MAX_SINGLE_PNG_SIZE_BYTES} bytes.`
    };
  }
  if (!isPngMagicBytes(pngBytes)) {
    return {
      code: "INVALID_PNG",
      message: "The provided bytes are not a valid PNG file."
    };
  }
  return null;
}
function mapSharpProcessingFailure(error, stage) {
  const detail = error instanceof Error ? error.message : "Unknown image processing error.";
  return {
    code: stage === "decode" ? "DECODE_FAILED" : "ENCODE_FAILED",
    message: stage === "decode" ? `The PNG image could not be decoded: ${detail}` : `The derivative image could not be encoded as WebP: ${detail}`
  };
}
function assertDerivativeWithinSizeLimit(bytes, label) {
  if (bytes.byteLength > MAX_DERIVATIVE_FILE_SIZE_BYTES) {
    return {
      code: "DERIVATIVE_TOO_LARGE",
      message: `${label} WebP output exceeds the maximum allowed size of ${MAX_DERIVATIVE_FILE_SIZE_BYTES} bytes.`
    };
  }
  if (!isWebpMagicBytes(bytes)) {
    return {
      code: "ENCODE_FAILED",
      message: `${label} output is not a valid WebP image.`
    };
  }
  return null;
}
async function encodeWebpDerivative(sharpApi2, inputBuffer, options2) {
  try {
    const pipeline2 = sharpApi2(inputBuffer, { failOn: "error" }).resize(
      options2.maxWidth,
      options2.maxHeight,
      {
        fit: "inside",
        withoutEnlargement: !DERIVATIVE_ALLOW_UPSCALE
      }
    );
    const webpOptions = {
      quality: options2.quality,
      effort: 4
    };
    if (DERIVATIVE_PRESERVE_ALPHA) {
      webpOptions.alphaQuality = options2.quality;
    }
    const output = await pipeline2.webp(webpOptions).toBuffer({ resolveWithObject: true });
    const bytes = Uint8Array.from(output.data);
    const sizeError = assertDerivativeWithinSizeLimit(bytes, options2.label);
    if (sizeError) {
      return { success: false, error: sizeError };
    }
    return {
      success: true,
      data: {
        bytes,
        width: output.info.width,
        height: output.info.height,
        byteLength: bytes.byteLength
      }
    };
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("input buffer") || message.includes("unsupported image") || message.includes("png")) {
      return { success: false, error: mapSharpProcessingFailure(error, "decode") };
    }
    return { success: false, error: mapSharpProcessingFailure(error, "encode") };
  }
}
let sharpApi = null;
function mapSharpLoadFailure(error) {
  const detail = error instanceof Error ? error.message : "Unknown sharp load error.";
  return {
    code: "SHARP_LOAD_FAILED",
    message: `The image processing library could not be loaded in the main process: ${detail}`
  };
}
async function loadSharpModule() {
  if (sharpApi) {
    return sharpApi;
  }
  try {
    const module = await import("sharp");
    sharpApi = module.default;
    return sharpApi;
  } catch (error) {
    throw mapSharpLoadFailure(error);
  }
}
async function ensureSharpLoaded() {
  try {
    const api = await loadSharpModule();
    return { ok: true, version: api.versions.sharp ?? "unknown" };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      return { ok: false, error };
    }
    return { ok: false, error: mapSharpLoadFailure(error) };
  }
}
function mapUnexpectedFailure(error) {
  const detail = error instanceof Error ? error.message : "An unexpected error occurred.";
  return {
    code: "PROCESSING_FAILED",
    message: `Derivative generation failed: ${detail}`
  };
}
function isDerivativeGenerationFailure(error) {
  return typeof error === "object" && error !== null && "code" in error && "message" in error && typeof error.code === "string" && typeof error.message === "string";
}
async function generateDerivativesFromValidatedInput(request) {
  const inputBuffer = Buffer.from(request.pngBytes);
  let sharpModule;
  try {
    sharpModule = await loadSharpModule();
  } catch (error) {
    if (isDerivativeGenerationFailure(error)) {
      return { success: false, error };
    }
    return { success: false, error: mapUnexpectedFailure(error) };
  }
  const thumbnailResult = await encodeWebpDerivative(sharpModule, inputBuffer, {
    label: "Thumbnail",
    maxWidth: THUMBNAIL_MAX_WIDTH_PX,
    maxHeight: THUMBNAIL_MAX_HEIGHT_PX,
    quality: THUMBNAIL_WEBP_QUALITY
  });
  if (!thumbnailResult.success) {
    return thumbnailResult;
  }
  const previewResult = await encodeWebpDerivative(sharpModule, inputBuffer, {
    label: "Preview",
    maxWidth: PREVIEW_MAX_WIDTH_PX,
    maxHeight: PREVIEW_MAX_HEIGHT_PX,
    quality: PREVIEW_WEBP_QUALITY
  });
  if (!previewResult.success) {
    return previewResult;
  }
  return {
    success: true,
    data: {
      thumbnailBytes: thumbnailResult.data.bytes,
      previewBytes: previewResult.data.bytes,
      thumbnail: {
        format: "webp",
        quality: THUMBNAIL_WEBP_QUALITY,
        width: thumbnailResult.data.width,
        height: thumbnailResult.data.height,
        byteLength: thumbnailResult.data.byteLength
      },
      preview: {
        format: "webp",
        quality: PREVIEW_WEBP_QUALITY,
        width: previewResult.data.width,
        height: previewResult.data.height,
        byteLength: previewResult.data.byteLength
      }
    }
  };
}
const derivativeGenerationService = {
  async generateFromPngBytes(request) {
    const validationError = validateDerivativeGenerationRequest(request);
    if (validationError) {
      return { success: false, error: validationError };
    }
    try {
      return await derivativeConcurrencyQueue.run(() => generateDerivativesFromValidatedInput(request));
    } catch (error) {
      if (isDerivativeGenerationFailure(error)) {
        return { success: false, error };
      }
      return { success: false, error: mapUnexpectedFailure(error) };
    }
  }
};
async function enrichReadResultWithDerivatives(result, includeDerivatives) {
  if (!includeDerivatives) {
    return result;
  }
  const derivativeOutcome = await derivativeGenerationService.generateFromPngBytes({
    pngBytes: result.bytes,
    fileName: result.fileName,
    fileSizeBytes: result.fileSizeBytes
  });
  if (!derivativeOutcome.success) {
    return {
      ...result,
      derivativeError: derivativeOutcome.error
    };
  }
  return {
    ...result,
    derivatives: {
      thumbnailBytes: derivativeOutcome.data.thumbnailBytes,
      previewBytes: derivativeOutcome.data.previewBytes,
      thumbnail: derivativeOutcome.data.thumbnail,
      preview: derivativeOutcome.data.preview
    }
  };
}
async function readSelectedPngFileBytes(filePath) {
  await validatePngFile(filePath);
  const fileBuffer = await readFile(filePath);
  return {
    filePath,
    fileName: getFileName(filePath),
    fileSizeBytes: fileBuffer.length,
    bytes: Uint8Array.from(fileBuffer)
  };
}
function mapReadBytesError(error) {
  if (error instanceof PngValidationError) {
    if (error.message.includes("maximum allowed size")) {
      return { code: "FILE_TOO_LARGE", message: error.message };
    }
    return { code: "VALIDATION_FAILED", message: error.message };
  }
  if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
    return {
      code: "FILE_NOT_FOUND",
      message: "The selected file could not be found."
    };
  }
  return {
    code: "INTERNAL_ERROR",
    message: "An unexpected error occurred while reading the PNG file."
  };
}
const DEFAULT_READ_PNG_FILE_BYTES_OPTIONS = {
  includeDerivatives: false
};
function isReadBatchValidatedPngFileBytesRequest(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  const request = value;
  return typeof request.jobId === "string" && request.jobId.trim().length > 0 && typeof request.filePath === "string" && request.filePath.trim().length > 0;
}
function isReadSinglePngFileBytesRequest(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  const request = value;
  return typeof request.filePath === "string" && request.filePath.trim().length > 0 && !("jobId" in request);
}
function resolveIncludeDerivatives(value) {
  return value === true;
}
function validateReadPngFileBytesRequest(webContentsId, payload) {
  if (typeof payload === "string") {
    if (isUnsafeClientFilePath(payload)) {
      return importIpcFailure("INVALID_INPUT", "The provided file path is invalid.");
    }
    if (!isRegisteredImportFilePath(payload)) {
      return importIpcFailure(
        "INVALID_INPUT",
        "Use a PNG file only after selecting it with the file picker."
      );
    }
    if (!isValidatedImportFilePath(payload)) {
      return importIpcFailure(
        "INVALID_INPUT",
        "Read PNG bytes only after the file has passed validation."
      );
    }
    return {
      mode: "single",
      filePath: payload,
      includeDerivatives: DEFAULT_READ_PNG_FILE_BYTES_OPTIONS.includeDerivatives
    };
  }
  if (isReadSinglePngFileBytesRequest(payload)) {
    if (isUnsafeClientFilePath(payload.filePath)) {
      return importIpcFailure("INVALID_INPUT", "The provided file path is invalid.");
    }
    if (!isRegisteredImportFilePath(payload.filePath)) {
      return importIpcFailure(
        "INVALID_INPUT",
        "Use a PNG file only after selecting it with the file picker."
      );
    }
    if (!isValidatedImportFilePath(payload.filePath)) {
      return importIpcFailure(
        "INVALID_INPUT",
        "Read PNG bytes only after the file has passed validation."
      );
    }
    return {
      mode: "single",
      filePath: payload.filePath,
      includeDerivatives: resolveIncludeDerivatives(payload.includeDerivatives)
    };
  }
  if (!isReadBatchValidatedPngFileBytesRequest(payload)) {
    return importIpcFailure(
      "INVALID_INPUT",
      "A validated PNG file path or batch read request is required."
    );
  }
  if (isUnsafeClientFilePath(payload.filePath)) {
    return importIpcFailure("INVALID_INPUT", "The provided file path is invalid.");
  }
  const session = getBatchImportSession(payload.jobId);
  if (!session) {
    return importIpcFailure(
      "INVALID_INPUT",
      "No batch import session was found for the provided job ID."
    );
  }
  if (session.webContentsId !== webContentsId) {
    return importIpcFailure(
      "INVALID_INPUT",
      "The batch import session does not belong to this window."
    );
  }
  if (session.status !== "discovering") {
    return importIpcFailure(
      "INVALID_INPUT",
      "Batch PNG bytes can only be read while the batch session is awaiting upload."
    );
  }
  if (!isBatchValidatedPath(payload.jobId, payload.filePath)) {
    return importIpcFailure(
      "INVALID_INPUT",
      "The requested file path was not validated for this batch import job."
    );
  }
  return {
    mode: "batch",
    request: payload,
    includeDerivatives: resolveIncludeDerivatives(payload.includeDerivatives)
  };
}
const PNG_PREVIEW_MAX_WIDTH_PX = 320;
function getSelectedPngPreview(filePath) {
  const image = nativeImage.createFromPath(filePath);
  if (image.isEmpty()) {
    return null;
  }
  const { width, height } = image.getSize();
  if (width <= 0 || height <= 0) {
    return null;
  }
  const previewImage = width > PNG_PREVIEW_MAX_WIDTH_PX ? image.resize({ width: PNG_PREVIEW_MAX_WIDTH_PX }) : image;
  const previewSize = previewImage.getSize();
  const dataUrl = previewImage.toDataURL();
  if (!dataUrl) {
    return null;
  }
  return {
    dataUrl,
    previewWidth: previewSize.width,
    previewHeight: previewSize.height
  };
}
function getActiveBrowserWindow() {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (focusedWindow) {
    return focusedWindow;
  }
  const allWindows = BrowserWindow.getAllWindows();
  return allWindows[0] ?? null;
}
async function selectImportFolder(webContentsId) {
  const browserWindow = getActiveBrowserWindow();
  const dialogOptions = {
    properties: ["openDirectory"],
    title: "Select folder to import"
  };
  const dialogResult = browserWindow ? await dialog.showOpenDialog(browserWindow, dialogOptions) : await dialog.showOpenDialog(dialogOptions);
  if (dialogResult.canceled || dialogResult.filePaths.length === 0) {
    return { canceled: true };
  }
  const selectedPath = dialogResult.filePaths[0];
  if (!selectedPath) {
    return { canceled: true };
  }
  const normalizedPath = path.normalize(selectedPath);
  const folderStats = await stat(normalizedPath);
  if (!folderStats.isDirectory()) {
    throw new Error("The selected path is not a folder.");
  }
  const session = registerBatchImportSelection({
    webContentsId,
    sourceType: "folder",
    folderPath: normalizedPath
  });
  return {
    canceled: false,
    jobId: session.jobId,
    sourceType: "folder",
    folderName: getFileName(normalizedPath)
  };
}
async function buildSelectedZipFile(filePath) {
  const normalizedPath = path.normalize(filePath);
  const fileStats = await stat(normalizedPath);
  if (!fileStats.isFile()) {
    throw new Error("The selected path is not a file.");
  }
  if (getFileExtension(normalizedPath) !== ".zip") {
    throw new Error("Only ZIP files can be selected.");
  }
  return {
    filePath: normalizedPath,
    fileName: getFileName(normalizedPath),
    fileSizeBytes: fileStats.size
  };
}
async function selectImportZipFile(webContentsId) {
  const browserWindow = getActiveBrowserWindow();
  const dialogOptions = {
    properties: ["openFile"],
    title: "Select ZIP file",
    filters: [{ name: "ZIP Archives", extensions: ["zip"] }]
  };
  const dialogResult = browserWindow ? await dialog.showOpenDialog(browserWindow, dialogOptions) : await dialog.showOpenDialog(dialogOptions);
  if (dialogResult.canceled || dialogResult.filePaths.length === 0) {
    return { canceled: true };
  }
  const selectedPath = dialogResult.filePaths[0];
  if (!selectedPath) {
    return { canceled: true };
  }
  const file = await buildSelectedZipFile(selectedPath);
  if (file.fileSizeBytes > MAX_ZIP_SIZE_BYTES) {
    throw new Error("The selected ZIP file exceeds the 200 MB import limit.");
  }
  const session = registerBatchImportSelection({
    webContentsId,
    sourceType: "zip",
    zipFilePath: file.filePath
  });
  return {
    canceled: false,
    jobId: session.jobId,
    sourceType: "zip",
    fileName: file.fileName,
    fileSizeBytes: file.fileSizeBytes
  };
}
async function buildSelectedPngFile(filePath) {
  const normalizedPath = path.normalize(filePath);
  const fileStats = await stat(normalizedPath);
  if (!fileStats.isFile()) {
    throw new Error("The selected path is not a file.");
  }
  if (!hasAllowedExtension(normalizedPath)) {
    throw new Error("Only PNG files can be selected.");
  }
  return {
    filePath: normalizedPath,
    fileName: getFileName(normalizedPath),
    fileSizeBytes: fileStats.size,
    extension: getSelectedPngExtension(normalizedPath)
  };
}
async function selectMultiplePngFiles(webContentsId) {
  const browserWindow = getActiveBrowserWindow();
  const dialogOptions = {
    properties: ["openFile", "multiSelections"],
    title: "Select PNG files",
    filters: [{ name: "PNG Images", extensions: ["png"] }]
  };
  const dialogResult = browserWindow ? await dialog.showOpenDialog(browserWindow, dialogOptions) : await dialog.showOpenDialog(dialogOptions);
  if (dialogResult.canceled || dialogResult.filePaths.length === 0) {
    return { canceled: true };
  }
  if (dialogResult.filePaths.length > MAX_BATCH_FILES) {
    throw new Error(
      `You can select up to ${MAX_BATCH_FILES} PNG files per batch. Reduce your selection and try again.`
    );
  }
  const files = await Promise.all(
    dialogResult.filePaths.map(async (selectedPath) => {
      if (!selectedPath) {
        throw new Error("A selected file path was missing.");
      }
      return buildSelectedPngFile(selectedPath);
    })
  );
  const session = registerBatchImportSelection({
    webContentsId,
    sourceType: "multiple-png",
    filePaths: files.map((file) => file.filePath)
  });
  return {
    canceled: false,
    jobId: session.jobId,
    sourceType: "multiple-png",
    fileCount: files.length,
    fileNames: files.map((file) => file.fileName)
  };
}
async function selectSinglePngFile() {
  const browserWindow = getActiveBrowserWindow();
  const dialogOptions = {
    properties: ["openFile"],
    title: "Select PNG file",
    filters: [{ name: "PNG Images", extensions: ["png"] }]
  };
  const dialogResult = browserWindow ? await dialog.showOpenDialog(browserWindow, dialogOptions) : await dialog.showOpenDialog(dialogOptions);
  if (dialogResult.canceled || dialogResult.filePaths.length === 0) {
    return { canceled: true };
  }
  const selectedPath = dialogResult.filePaths[0];
  if (!selectedPath) {
    return { canceled: true };
  }
  const file = await buildSelectedPngFile(selectedPath);
  registerImportFilePath(file.filePath);
  return {
    canceled: false,
    file
  };
}
async function createTestPngBuffer(options2) {
  const sharpApi2 = await loadSharpModule();
  const buffer = await sharpApi2({
    create: {
      width: options2.width,
      height: options2.height,
      channels: 4,
      background: { r: 200, g: 40, b: 40, alpha: options2.alpha }
    }
  }).png().toBuffer();
  return Uint8Array.from(buffer);
}
async function verifyDerivativeGenerationInMainProcess() {
  const details = [];
  const sharpStatus = await ensureSharpLoaded();
  if (!sharpStatus.ok) {
    details.push(sharpStatus.error.message);
    return {
      sharpLoadOk: false,
      sharpVersion: null,
      validPngTestPassed: false,
      transparentPngTestPassed: false,
      noUpscaleTestPassed: false,
      invalidPngTestPassed: false,
      details
    };
  }
  details.push(`sharp ${sharpStatus.version} loaded in main process.`);
  const validPngBytes = await createTestPngBuffer({ width: 800, height: 600, alpha: 1 });
  const validResult = await derivativeGenerationService.generateFromPngBytes({
    pngBytes: validPngBytes,
    fileName: "verify-valid.png",
    fileSizeBytes: validPngBytes.byteLength
  });
  const validPngTestPassed = validResult.success;
  if (validPngTestPassed) {
    details.push(
      `Valid PNG test passed (thumbnail ${validResult.data.thumbnail.width}x${validResult.data.thumbnail.height}, preview ${validResult.data.preview.width}x${validResult.data.preview.height}).`
    );
  } else {
    details.push(`Valid PNG test failed: ${validResult.error.message}`);
  }
  const transparentPngBytes = await createTestPngBuffer({ width: 400, height: 400, alpha: 0.4 });
  const transparentResult = await derivativeGenerationService.generateFromPngBytes({
    pngBytes: transparentPngBytes,
    fileName: "verify-transparent.png",
    fileSizeBytes: transparentPngBytes.byteLength
  });
  const transparentPngTestPassed = transparentResult.success;
  if (transparentPngTestPassed) {
    details.push("Transparent PNG test passed.");
  } else {
    details.push(`Transparent PNG test failed: ${transparentResult.error.message}`);
  }
  const smallPngBytes = await createTestPngBuffer({ width: 64, height: 48, alpha: 1 });
  const noUpscaleResult = await derivativeGenerationService.generateFromPngBytes({
    pngBytes: smallPngBytes,
    fileName: "verify-small.png",
    fileSizeBytes: smallPngBytes.byteLength
  });
  const noUpscaleTestPassed = noUpscaleResult.success && noUpscaleResult.data.thumbnail.width === 64 && noUpscaleResult.data.thumbnail.height === 48;
  if (noUpscaleTestPassed) {
    details.push("No-upscale test passed (64x48 thumbnail preserved).");
  } else if (noUpscaleResult.success) {
    details.push(
      `No-upscale test failed: thumbnail became ${noUpscaleResult.data.thumbnail.width}x${noUpscaleResult.data.thumbnail.height}.`
    );
  } else {
    details.push(`No-upscale test failed: ${noUpscaleResult.error.message}`);
  }
  const invalidResult = await derivativeGenerationService.generateFromPngBytes({
    pngBytes: Uint8Array.from([0, 1, 2, 3]),
    fileName: "verify-invalid.png",
    fileSizeBytes: 4
  });
  const invalidPngTestPassed = !invalidResult.success && invalidResult.error.code === "INVALID_PNG";
  if (invalidPngTestPassed) {
    details.push("Invalid PNG test passed (safe rejection).");
  } else {
    details.push("Invalid PNG test failed (expected INVALID_PNG rejection).");
  }
  return {
    sharpLoadOk: true,
    sharpVersion: sharpStatus.version,
    validPngTestPassed,
    transparentPngTestPassed,
    noUpscaleTestPassed,
    invalidPngTestPassed,
    details
  };
}
async function runDevDerivativeGenerationVerification() {
  const result = await verifyDerivativeGenerationInMainProcess();
  const passed = result.sharpLoadOk && result.validPngTestPassed && result.transparentPngTestPassed && result.noUpscaleTestPassed && result.invalidPngTestPassed;
  const prefix = passed ? "[Phase 3C] Derivative verification passed" : "[Phase 3C] Derivative verification failed";
  console.info(prefix, result);
}
function registerDevDerivativeVerificationIpc() {
  ipcMain.handle(IMPORT_VERIFY_DERIVATIVE_GENERATION, async () => {
    try {
      const result = await verifyDerivativeGenerationInMainProcess();
      if (!result.sharpLoadOk) {
        return importIpcFailure("INTERNAL_ERROR", result.details.join(" "));
      }
      return importIpcSuccess(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Derivative generation verification failed unexpectedly.";
      return importIpcFailure("INTERNAL_ERROR", message);
    }
  });
}
function validateFilePathInput(filePath, requireValidated = false) {
  if (typeof filePath !== "string") {
    return importIpcFailure("INVALID_INPUT", "A file path string is required.");
  }
  if (isUnsafeClientFilePath(filePath)) {
    return importIpcFailure("INVALID_INPUT", "The provided file path is invalid.");
  }
  if (!isRegisteredImportFilePath(filePath)) {
    return importIpcFailure(
      "INVALID_INPUT",
      "Use a PNG file only after selecting it with the file picker."
    );
  }
  if (requireValidated && !isValidatedImportFilePath(filePath)) {
    return importIpcFailure(
      "INVALID_INPUT",
      "Read PNG bytes only after the file has passed validation."
    );
  }
  return null;
}
function mapValidationError(error) {
  if (error instanceof PngValidationError) {
    if (error.message.includes("maximum allowed size")) {
      return importIpcFailure("FILE_TOO_LARGE", error.message);
    }
    return importIpcFailure("VALIDATION_FAILED", error.message);
  }
  if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
    return importIpcFailure("FILE_NOT_FOUND", "The selected file could not be found.");
  }
  return importIpcFailure("INTERNAL_ERROR", "An unexpected error occurred while validating the PNG file.");
}
function mapPickerError(error) {
  if (error instanceof Error) {
    if (error.message.includes("200 MB")) {
      return importIpcFailure("FILE_TOO_LARGE", error.message);
    }
    if (error.message.includes("up to")) {
      return importIpcFailure("INVALID_INPUT", error.message);
    }
    if (error.message.includes("batch import session is already active")) {
      return importIpcFailure("SESSION_CONFLICT", error.message);
    }
    return importIpcFailure("INTERNAL_ERROR", error.message);
  }
  return importIpcFailure("INTERNAL_ERROR", "An unexpected error occurred while opening the file picker.");
}
async function handleBatchPicker(event, picker) {
  const sessionError = assertCanStartBatchImport();
  if (sessionError) {
    return sessionError;
  }
  try {
    const result = await picker(event.sender.id);
    return importIpcSuccess(result);
  } catch (error) {
    return mapPickerError(error);
  }
}
function registerImportIpcHandlers() {
  ipcMain.handle(IMPORT_IPC_CHANNELS.SELECT_SINGLE_PNG, async () => {
    const sessionError = assertCanStartSingleFileImport();
    if (sessionError) {
      return sessionError;
    }
    try {
      const result = await selectSinglePngFile();
      return importIpcSuccess(result);
    } catch (error) {
      if (error instanceof Error) {
        return importIpcFailure("INTERNAL_ERROR", error.message);
      }
      return importIpcFailure(
        "INTERNAL_ERROR",
        "An unexpected error occurred while opening the file picker."
      );
    }
  });
  ipcMain.handle(IMPORT_IPC_CHANNELS.CLEAR_SINGLE_PNG_IMPORT, async () => {
    clearImportFileSession();
    return importIpcSuccess({ cleared: true });
  });
  ipcMain.handle(IMPORT_IPC_CHANNELS.VALIDATE_SELECTED_PNG, async (_event, filePath) => {
    try {
      const validationError = validateFilePathInput(filePath);
      if (validationError) {
        return validationError;
      }
      const result = await validatePngFile(filePath);
      markImportFileValidated(filePath);
      return importIpcSuccess(result);
    } catch (error) {
      return mapValidationError(error);
    }
  });
  ipcMain.handle(IMPORT_IPC_CHANNELS.READ_SELECTED_PNG_BYTES, async (event, payload) => {
    try {
      const validated = validateReadPngFileBytesRequest(event.sender.id, payload);
      if (!("mode" in validated)) {
        return validated;
      }
      const baseResult = validated.mode === "batch" ? await readBatchValidatedPngFileBytes(validated.request.filePath) : await readSelectedPngFileBytes(validated.filePath);
      const result = await enrichReadResultWithDerivatives(
        baseResult,
        validated.includeDerivatives
      );
      return importIpcSuccess(result);
    } catch (error) {
      const mappedError = mapReadBytesError(error);
      return importIpcFailure(mappedError.code, mappedError.message);
    }
  });
  ipcMain.handle(IMPORT_IPC_CHANNELS.GET_SELECTED_PNG_PREVIEW, async (_event, filePath) => {
    try {
      const validationError = validateFilePathInput(filePath, true);
      if (validationError) {
        return validationError;
      }
      const preview = getSelectedPngPreview(filePath);
      if (!preview) {
        return importIpcFailure(
          "VALIDATION_FAILED",
          "A preview could not be generated for the selected PNG file."
        );
      }
      return importIpcSuccess(preview);
    } catch {
      return importIpcFailure(
        "INTERNAL_ERROR",
        "An unexpected error occurred while generating the PNG preview."
      );
    }
  });
  ipcMain.handle(IMPORT_IPC_CHANNELS.SELECT_MULTIPLE_PNG, async (event) => {
    return handleBatchPicker(event, selectMultiplePngFiles);
  });
  ipcMain.handle(IMPORT_IPC_CHANNELS.SELECT_IMPORT_FOLDER, async (event) => {
    return handleBatchPicker(event, selectImportFolder);
  });
  ipcMain.handle(IMPORT_IPC_CHANNELS.SELECT_IMPORT_ZIP, async (event) => {
    return handleBatchPicker(event, selectImportZipFile);
  });
  ipcMain.handle(IMPORT_IPC_CHANNELS.START_BATCH_DISCOVERY, async (event, payload) => {
    const validated = validateStartBatchDiscoveryRequest(payload);
    if ("error" in validated && validated.error) {
      return validated.error;
    }
    const { jobId, sourceType } = validated.request;
    const startError = validateBatchDiscoveryStart(jobId, event.sender.id, sourceType);
    if (startError) {
      return importIpcFailure("INVALID_INPUT", startError);
    }
    if (!markBatchDiscoveryRunning(jobId)) {
      return importIpcFailure(
        "INVALID_INPUT",
        "Batch discovery is already in progress for this job."
      );
    }
    void runBatchImportDiscovery({
      jobId,
      sourceType,
      webContents: event.sender
    });
    return importIpcSuccess({
      jobId,
      accepted: true
    });
  });
  ipcMain.handle(IMPORT_IPC_CHANNELS.CANCEL_BATCH_JOB, async (event, payload) => {
    const validated = validateCancelBatchImportJobRequest(payload);
    if ("error" in validated && validated.error) {
      return validated.error;
    }
    const result = cancelBatchImportJob(validated.request, event.sender.id);
    if (!result.canceled) {
      return importIpcFailure(
        "INVALID_INPUT",
        "The batch import job could not be canceled. It may not exist or is no longer active."
      );
    }
    return importIpcSuccess(result);
  });
  ipcMain.handle(IMPORT_IPC_CHANNELS.FINISH_BATCH_JOB, async (event, payload) => {
    const validated = validateFinishBatchImportJobRequest(payload);
    if ("error" in validated && validated.error) {
      return validated.error;
    }
    const result = await finishBatchImportJob(validated.request, event.sender.id);
    if (!result.sessionCleared) {
      return importIpcFailure(
        "INVALID_INPUT",
        "The batch import job could not be finished. It may not exist or is no longer active."
      );
    }
    return importIpcSuccess(result);
  });
  if (!app.isPackaged) {
    registerDevDerivativeVerificationIpc();
  }
}
function attachTextInputContextMenu(webContents) {
  webContents.on("context-menu", (_event, params) => {
    if (params.isEditable) {
      const menu = Menu.buildFromTemplate([
        { role: "cut", enabled: params.editFlags.canCut },
        { role: "copy", enabled: params.editFlags.canCopy },
        { role: "paste", enabled: params.editFlags.canPaste },
        { type: "separator" },
        { role: "selectAll", enabled: params.editFlags.canSelectAll }
      ]);
      menu.popup();
      return;
    }
    if (params.selectionText.trim().length > 0) {
      const menu = Menu.buildFromTemplate([{ role: "copy" }]);
      menu.popup();
    }
  });
}
suppressDevToolsAutofillConsoleNoise();
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
const appName = "Fresh Prints Desktop";
const appIconFileName = "fresh-prints-logo.svg";
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
let saveWindowStateTimeout = null;
function getWindowStatePath() {
  return path.join(app.getPath("userData"), "window-state.json");
}
function isValidWindowBounds(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  const bounds = value;
  return typeof bounds.x === "number" && typeof bounds.y === "number" && typeof bounds.width === "number" && typeof bounds.height === "number" && bounds.width >= 640 && bounds.height >= 480;
}
function isValidWindowState(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  const state = value;
  return isValidWindowBounds(state.bounds) && typeof state.isMaximized === "boolean";
}
function rectanglesIntersect(first, second) {
  return first.x < second.x + second.width && first.x + first.width > second.x && first.y < second.y + second.height && first.y + first.height > second.y;
}
function isVisibleOnAnyDisplay(bounds) {
  return screen.getAllDisplays().some((display) => rectanglesIntersect(bounds, display.workArea));
}
function getCenteredPrimaryDisplayBounds() {
  const { workArea } = screen.getPrimaryDisplay();
  const width = Math.min(1280, workArea.width);
  const height = Math.min(800, workArea.height);
  return {
    x: Math.round(workArea.x + (workArea.width - width) / 2),
    y: Math.round(workArea.y + (workArea.height - height) / 2),
    width,
    height
  };
}
function loadWindowState() {
  const fallbackState = {
    bounds: getCenteredPrimaryDisplayBounds(),
    isMaximized: false
  };
  try {
    const windowStatePath = getWindowStatePath();
    if (!existsSync(windowStatePath)) {
      return fallbackState;
    }
    const parsedState = JSON.parse(readFileSync(windowStatePath, "utf-8"));
    if (!isValidWindowState(parsedState) || !isVisibleOnAnyDisplay(parsedState.bounds)) {
      return fallbackState;
    }
    return parsedState;
  } catch {
    return fallbackState;
  }
}
function saveWindowState(browserWindow) {
  if (browserWindow.isDestroyed()) {
    return;
  }
  const windowState = {
    bounds: browserWindow.getNormalBounds(),
    isMaximized: browserWindow.isMaximized()
  };
  try {
    writeFileSync(getWindowStatePath(), JSON.stringify(windowState, null, 2));
  } catch {
  }
}
function scheduleWindowStateSave(browserWindow) {
  if (saveWindowStateTimeout) {
    clearTimeout(saveWindowStateTimeout);
  }
  saveWindowStateTimeout = setTimeout(() => {
    saveWindowState(browserWindow);
    saveWindowStateTimeout = null;
  }, 300);
}
function createWindow() {
  const savedWindowState = loadWindowState();
  const windowOptions = {
    ...savedWindowState.bounds,
    icon: path.join(process.env.VITE_PUBLIC ?? RENDERER_DIST, appIconFileName),
    title: appName,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname$1, "preload.mjs")
    }
  };
  win = new BrowserWindow({
    ...windowOptions
  });
  if (savedWindowState.isMaximized) {
    win.maximize();
  }
  win.on("resize", () => scheduleWindowStateSave(win));
  win.on("move", () => scheduleWindowStateSave(win));
  win.on("close", () => saveWindowState(win));
  if (!app.isPackaged) {
    attachDevToolsWindowPersistence(win.webContents);
  }
  attachTextInputContextMenu(win.webContents);
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(() => {
  app.setName(appName);
  Menu.setApplicationMenu(null);
  registerAppIpcHandlers();
  registerImportIpcHandlers();
  if (!app.isPackaged) {
    void runDevDerivativeGenerationVerification();
  }
  createWindow();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
