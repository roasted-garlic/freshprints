import type { ImportIpcResult } from "../import/importIpc.types";

export type StudioUpdateChannel = "stable" | "prerelease";

export type StudioUpdateStatus =
  | "idle"
  | "checking"
  | "up-to-date"
  | "available"
  | "downloading"
  | "downloaded"
  | "error";

export interface StudioUpdateReleaseInfo {
  version: string;
  releaseName: string | null;
  releaseNotes: string | null;
  releaseDate: string | null;
}

export interface StudioUpdateDownloadProgress {
  percent: number;
  transferredBytes: number;
  totalBytes: number;
  bytesPerSecond: number;
}

export interface StudioUpdateState {
  status: StudioUpdateStatus;
  channel: StudioUpdateChannel;
  currentVersion: string;
  /** True only in packaged builds where autoUpdater actually runs. */
  isUpdateCapable: boolean;
  availableRelease: StudioUpdateReleaseInfo | null;
  downloadProgress: StudioUpdateDownloadProgress | null;
  /** User dismissed the current available/downloaded update; re-offered on the next check. */
  isPostponed: boolean;
  errorMessage: string | null;
  lastCheckedAt: string | null;
}

export interface CheckForStudioUpdateResult {
  state: StudioUpdateState;
}

export interface DownloadStudioUpdateResult {
  state: StudioUpdateState;
}

export interface RestartAndInstallStudioUpdateResult {
  /** False only when there is no downloaded update ready to install. */
  willRestart: boolean;
}

export interface PostponeStudioUpdateResult {
  state: StudioUpdateState;
}

export interface FreshPrintsStudioUpdateApi {
  getState(): Promise<ImportIpcResult<StudioUpdateState>>;
  checkForUpdate(): Promise<ImportIpcResult<CheckForStudioUpdateResult>>;
  downloadUpdate(): Promise<ImportIpcResult<DownloadStudioUpdateResult>>;
  restartAndInstall(): Promise<ImportIpcResult<RestartAndInstallStudioUpdateResult>>;
  postpone(): Promise<ImportIpcResult<PostponeStudioUpdateResult>>;
  onStateChanged(callback: (state: StudioUpdateState) => void): () => void;
}
