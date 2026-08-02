import type {
  StudioUpdateDownloadProgress,
  StudioUpdateReleaseInfo,
  StudioUpdateState,
} from "../types/studioUpdate/studioUpdateIpc.types";

export function applyCheckingStarted(state: StudioUpdateState): StudioUpdateState {
  return { ...state, status: "checking", errorMessage: null };
}

export function applyUpdateAvailable(
  state: StudioUpdateState,
  release: StudioUpdateReleaseInfo,
): StudioUpdateState {
  return {
    ...state,
    status: "available",
    isPostponed: false,
    availableRelease: release,
  };
}

export function applyUpdateNotAvailable(state: StudioUpdateState): StudioUpdateState {
  return {
    ...state,
    status: "up-to-date",
    availableRelease: null,
    downloadProgress: null,
  };
}

export function applyDownloadProgress(
  state: StudioUpdateState,
  progress: StudioUpdateDownloadProgress,
): StudioUpdateState {
  return { ...state, status: "downloading", downloadProgress: progress };
}

export function applyUpdateDownloaded(state: StudioUpdateState): StudioUpdateState {
  return { ...state, status: "downloaded", downloadProgress: null };
}

export function applyUpdateError(state: StudioUpdateState, message: string): StudioUpdateState {
  return { ...state, status: "error", errorMessage: message };
}

/** Postpone only makes sense while an update is actually on offer. */
export function applyPostpone(state: StudioUpdateState): StudioUpdateState {
  if (state.status !== "available" && state.status !== "downloaded") {
    return state;
  }
  return { ...state, isPostponed: true };
}

/** Restart-and-install is only ever safe to report as "will restart" once a download completed. */
export function canRestartAndInstall(state: StudioUpdateState): boolean {
  return state.isUpdateCapable && state.status === "downloaded";
}

/** Downloads may only start from an offered, not-yet-downloading "available" update. */
export function canStartDownload(state: StudioUpdateState): boolean {
  return state.isUpdateCapable && state.status === "available";
}
