import { app } from "electron";
import type { WebContents } from "electron";

import type {
  StudioUpdateChannel,
  StudioUpdateState,
} from "@fresh-prints/shared/types/studioUpdate/studioUpdateIpc.types";
import {
  applyCheckingStarted,
  applyDownloadProgress,
  applyPostpone,
  applyUpdateAvailable,
  applyUpdateDownloaded,
  applyUpdateError,
  applyUpdateNotAvailable,
  canRestartAndInstall,
  canStartDownload,
} from "@fresh-prints/shared/studioUpdate/studioUpdateStateTransitions";
import { toSafeStudioUpdateError } from "@fresh-prints/shared/studioUpdate/studioUpdateErrorMapping";
import { normalizeStudioReleaseNotes } from "@fresh-prints/shared/studioUpdate/studioUpdateReleaseNotes";
import { resolveStudioUpdateChannel } from "./studioUpdateChannel";
import { STUDIO_UPDATE_STATE_CHANGED } from "./studioUpdateIpcChannels";

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;

type AutoUpdaterLike = import("electron-updater").AppUpdater;

let state: StudioUpdateState = createInitialState();
let subscribers: Set<WebContents> = new Set();
let autoUpdater: AutoUpdaterLike | null = null;
let periodicCheckTimer: ReturnType<typeof setInterval> | null = null;
let hasPendingDownloadedUpdate = false;

function createInitialState(): StudioUpdateState {
  return {
    status: "idle",
    channel: resolveStudioUpdateChannel(),
    currentVersion: app.getVersion(),
    isUpdateCapable: app.isPackaged,
    availableRelease: null,
    downloadProgress: null,
    isPostponed: false,
    errorMessage: null,
    lastCheckedAt: null,
  };
}

function setState(next: StudioUpdateState): void {
  state = next;
  broadcastState();
}

function broadcastState(): void {
  for (const webContents of subscribers) {
    if (!webContents.isDestroyed()) {
      webContents.send(STUDIO_UPDATE_STATE_CHANGED, state);
    }
  }
}

/** Only ever true for packaged builds — dev/test builds never touch the network updater. */
function isUpdateCapable(): boolean {
  return app.isPackaged;
}

function handleUpdaterError(error: unknown, context: "check" | "download"): void {
  const safeError = toSafeStudioUpdateError(error, context);
  // Only the safe, fixed category/status hint is ever logged — never the raw error object, which
  // (per electron-updater's GitHubProvider) can carry full HTTP response bodies, headers, or
  // stack traces embedded directly in its `message` string.
  console.error(`[studio-update] ${context} failed: ${safeError.logHint}`);
  setState(applyUpdateError(state, safeError.message));
}

async function getAutoUpdater(): Promise<AutoUpdaterLike | null> {
  if (!isUpdateCapable()) {
    return null;
  }

  if (autoUpdater) {
    return autoUpdater;
  }

  const { autoUpdater: updater } = await import("electron-updater");

  updater.autoDownload = false;
  updater.autoInstallOnAppQuit = false;
  updater.allowPrerelease = resolveStudioUpdateChannel() === "prerelease";
  // Deliberately NOT setting updater.channel to our own app-level "prerelease" label.
  // electron-updater's GitHub provider only recognizes "alpha"/"beta" as standard prerelease
  // channel names (see GitHubProvider.js's shouldFetchVersion check) and requests a
  // "<channel>.yml" metadata file — electron-builder only ever publishes beta.yml/alpha.yml
  // (derived from the version's own semver prerelease tag, e.g. "1.0.0-beta.2" -> "beta") or
  // latest.yml for stable, never "prerelease.yml". Setting channel = "prerelease" here broke both
  // version selection and metadata lookup (confirmed: caused the HTTP 406 against
  // /releases/latest during the first live A/B proof attempt). Leaving channel unset lets
  // electron-updater derive it directly from app.getVersion()'s own prerelease tag, which always
  // matches what electron-builder actually published for that exact version.

  updater.on("checking-for-update", () => {
    setState(applyCheckingStarted(state));
  });

  updater.on("update-available", (info) => {
    setState(
      applyUpdateAvailable(state, {
        version: info.version,
        releaseName: typeof info.releaseName === "string" ? info.releaseName : null,
        // GitHub renders release notes as HTML; electron-updater's UpdateInfo.releaseNotes is
        // `string | Array<{ version, note }> | null`. Normalized to safe plain text here, in the
        // trusted main process, before it ever enters renderer-visible state — the original HTML
        // is never sent across IPC or stored anywhere.
        releaseNotes: normalizeStudioReleaseNotes(info.releaseNotes),
        releaseDate: typeof info.releaseDate === "string" ? info.releaseDate : null,
      }),
    );
  });

  updater.on("update-not-available", () => {
    setState(applyUpdateNotAvailable(state));
  });

  updater.on("download-progress", (progress) => {
    setState(
      applyDownloadProgress(state, {
        percent: progress.percent,
        transferredBytes: progress.transferred,
        totalBytes: progress.total,
        bytesPerSecond: progress.bytesPerSecond,
      }),
    );
  });

  updater.on("update-downloaded", () => {
    hasPendingDownloadedUpdate = true;
    setState(applyUpdateDownloaded(state));
  });

  updater.on("error", (error) => {
    handleUpdaterError(error, "check");
  });

  autoUpdater = updater;
  return autoUpdater;
}

export function getStudioUpdateState(): StudioUpdateState {
  return state;
}

export function subscribeToStudioUpdateState(webContents: WebContents): () => void {
  subscribers.add(webContents);
  webContents.send(STUDIO_UPDATE_STATE_CHANGED, state);

  return () => {
    subscribers.delete(webContents);
  };
}

let isCheckInFlight = false;

export async function checkForStudioUpdate(): Promise<StudioUpdateState> {
  if (!isUpdateCapable()) {
    setState(applyUpdateNotAvailable(state));
    return state;
  }

  if (isCheckInFlight) {
    return state;
  }

  isCheckInFlight = true;
  try {
    const updater = await getAutoUpdater();
    if (!updater) {
      setState(applyUpdateNotAvailable(state));
      return state;
    }

    setState({ ...state, lastCheckedAt: new Date().toISOString() });
    await updater.checkForUpdates();
  } catch (error) {
    handleUpdaterError(error, "check");
  } finally {
    isCheckInFlight = false;
  }

  return state;
}

let isDownloadInFlight = false;

export async function downloadStudioUpdate(): Promise<StudioUpdateState> {
  if (!canStartDownload(state)) {
    return state;
  }

  if (isDownloadInFlight) {
    return state;
  }

  isDownloadInFlight = true;
  try {
    const updater = await getAutoUpdater();
    if (!updater) {
      return state;
    }

    setState({ ...state, status: "downloading" });
    await updater.downloadUpdate();
  } catch (error) {
    handleUpdaterError(error, "download");
  } finally {
    isDownloadInFlight = false;
  }

  return state;
}

export function restartAndInstallStudioUpdate(): { willRestart: boolean } {
  if (!canRestartAndInstall(state) || !hasPendingDownloadedUpdate || !autoUpdater) {
    return { willRestart: false };
  }

  // isSilent=true runs the NSIS installer without showing its wizard UI; isForceRunAfter=true
  // relaunches Studio after the silent install completes. This only ever runs from an explicit
  // renderer "Restart to Update" click — never automatically, and never before update-downloaded
  // has fired (canRestartAndInstall/hasPendingDownloadedUpdate above gate that). Silent install
  // applies only to this automatic-update path; the manually downloaded first-time installer is
  // launched by the user directly (not through this code) and keeps its normal oneClick:false
  // assisted wizard — see apps/studio/electron-builder.json5, unchanged by this.
  autoUpdater.quitAndInstall(true, true);
  return { willRestart: true };
}

export function postponeStudioUpdate(): StudioUpdateState {
  setState(applyPostpone(state));
  return state;
}

export function startPeriodicStudioUpdateChecks(): void {
  if (!isUpdateCapable() || periodicCheckTimer) {
    return;
  }

  void checkForStudioUpdate();
  periodicCheckTimer = setInterval(() => {
    void checkForStudioUpdate();
  }, CHECK_INTERVAL_MS);
}

export function stopPeriodicStudioUpdateChecks(): void {
  if (periodicCheckTimer) {
    clearInterval(periodicCheckTimer);
    periodicCheckTimer = null;
  }
}

/** Test-only: resets in-memory module state between unit tests. */
export function __resetStudioUpdateStateForTests(channel?: StudioUpdateChannel): void {
  state = createInitialState();
  if (channel) {
    state = { ...state, channel };
  }
  subscribers = new Set();
  autoUpdater = null;
  hasPendingDownloadedUpdate = false;
  isCheckInFlight = false;
  isDownloadInFlight = false;
  stopPeriodicStudioUpdateChecks();
}
