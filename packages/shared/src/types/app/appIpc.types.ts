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
}
