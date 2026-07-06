import type { ImportIpcResult } from "../import/importIpc.types";
import type { WhatnotExistingShowSummary, WhatnotShowImportPlanEntry } from "../../utils/whatnotShowImportPlan";

export type { WhatnotExistingShowSummary } from "../../utils/whatnotShowImportPlan";

export interface OpenWhatnotImportWindowResult {
  opened: boolean;
}

export interface ScanWhatnotShowsResult {
  planEntries: WhatnotShowImportPlanEntry[];
}

export interface WhatnotShowImportSummary {
  created: number;
  updated: number;
  unchanged: number;
  skipped: number;
}

/** Sent from the split import window's shell panel to the main process. */
export interface WhatnotShowImportShellConfirmPayload {
  planEntries: WhatnotShowImportPlanEntry[];
  excludedIndexes: number[];
}

/** Forwarded from the main process to the owner (main app) window's renderer, with `baseUrl` attached. */
export interface WhatnotShowImportConfirmedEvent extends WhatnotShowImportShellConfirmPayload {
  baseUrl: string;
}

/** Sent back from the owner window's renderer once it has finished writing to Firestore. */
export type WhatnotShowImportCompletedEvent =
  | { status: "succeeded"; summary: WhatnotShowImportSummary }
  | { status: "failed"; error: string };

export type WhatnotImportShellPageStatusEvent =
  | { status: "loading" }
  | { status: "ready" }
  | { status: "failed"; error: string };

export interface FreshPrintsWhatnotImportApi {
  /** Opens the configured, validated Whatnot show base URL in a split import window. */
  openImportWindow(
    baseUrl: string,
    existingShows: WhatnotExistingShowSummary[],
  ): Promise<ImportIpcResult<OpenWhatnotImportWindowResult>>;
  /** Closes the import window, if open. */
  closeImportWindow(): Promise<ImportIpcResult<{ closed: boolean }>>;
  /** Main process is asking this (owner) window's renderer to import the staff-confirmed candidates. */
  onImportConfirmed(callback: (event: WhatnotShowImportConfirmedEvent) => void): () => void;
  /** Reports the import's outcome back to the main process (and onward to the import window's shell). */
  reportImportCompleted(event: WhatnotShowImportCompletedEvent): Promise<ImportIpcResult<{ acknowledged: boolean }>>;
}

export interface FreshPrintsWhatnotImportShellApi {
  /** Scans the currently loaded Whatnot page and returns a classified import plan. */
  scan(): Promise<ImportIpcResult<ScanWhatnotShowsResult>>;
  /** Sends the staff-confirmed selection back to the owner window for the actual Firestore writes. */
  confirm(
    payload: WhatnotShowImportShellConfirmPayload,
  ): Promise<ImportIpcResult<{ acknowledged: boolean }>>;
  /** Closes the whole split import window. */
  cancel(): Promise<ImportIpcResult<{ acknowledged: boolean }>>;
  /** The owner window's renderer (via the main process) reporting the import's outcome. */
  onImportCompleted(callback: (event: WhatnotShowImportCompletedEvent) => void): () => void;
  /** The Whatnot page's loading state. Scan is disabled until this reports ready. */
  onPageStatus(callback: (event: WhatnotImportShellPageStatusEvent) => void): () => void;
}
