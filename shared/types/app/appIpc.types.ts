import type { ImportIpcResult } from "../import/importIpc.types";

export interface OpenDevToolsResult {
  opened: boolean;
}

export interface FreshPrintsAppApi {
  openDevTools(): Promise<ImportIpcResult<OpenDevToolsResult>>;
}
