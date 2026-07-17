import type { ImportIpcResult } from "../import/importIpc.types";

export interface OpenDevToolsResult {
  opened: boolean;
}

export interface SetUploadActiveResult {
  acknowledged: boolean;
}

export interface ConfirmCloseResult {
  acknowledged: boolean;
}

export interface OpenExternalLinkResult {
  opened: boolean;
}

export interface DownloadUrlToFileRequest {
  downloadUrl: string;
  /** Suggested file name for the save dialog (sanitized in main). */
  fileName: string;
}

export interface DownloadUrlToFileResult {
  canceled: boolean;
  savedFilePath?: string;
}

export interface WindowMetricsResult {
  contentHeight: number;
  contentWidth: number;
  isMaximized: boolean;
  minHeight: number;
  minWidth: number;
  windowHeight: number;
  windowWidth: number;
}

export interface SetMinimumWindowSizeRequest {
  height: number;
  width: number;
}

export interface SetMinimumWindowSizeResult {
  minHeight: number;
  minWidth: number;
}

export interface ResetMinimumWindowSizeRequest {
  mode?: "default" | "unlock";
}

export interface FreshPrintsAppApi {
  openDevTools(): Promise<ImportIpcResult<OpenDevToolsResult>>;
  /** Push whether an import upload is currently in flight so the main process can guard window close. */
  setUploadActive(active: boolean): Promise<ImportIpcResult<SetUploadActiveResult>>;
  /** Tell the main process the user confirmed leaving; the window may now close. */
  confirmClose(): Promise<ImportIpcResult<ConfirmCloseResult>>;
  /** Main process is asking whether it's safe to close because an upload is active. */
  onConfirmCloseRequested(callback: () => void): () => void;
  /** Opens an http(s) URL in a window positioned on the same display as the app. Rejects non-http(s) schemes. */
  openExternalLink(url: string): Promise<ImportIpcResult<OpenExternalLinkResult>>;
  /**
   * Downloads a Firebase Storage https URL via the main process and prompts for a save path.
   * Avoids Electron renderer CORS failures on signed Storage URLs.
   */
  downloadUrlToFile(
    request: DownloadUrlToFileRequest,
  ): Promise<ImportIpcResult<DownloadUrlToFileResult>>;
  getWindowMetrics(): Promise<ImportIpcResult<WindowMetricsResult>>;
  setMinimumWindowSize(
    size: SetMinimumWindowSizeRequest,
  ): Promise<ImportIpcResult<SetMinimumWindowSizeResult>>;
  resetMinimumWindowSize(
    request?: ResetMinimumWindowSizeRequest,
  ): Promise<ImportIpcResult<SetMinimumWindowSizeResult>>;
}
