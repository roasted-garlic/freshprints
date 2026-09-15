export interface PreviewInternalGangSheetHistoricalReconciliationRequest {
  upcomingShowId: string;
}

export interface ApplyInternalGangSheetHistoricalReconciliationRequest {
  upcomingShowId: string;
  /** Optional checksum from preview to detect stale preview (best-effort). */
  previewChecksum?: string;
}

export type InternalGangSheetHistoricalReconciliationPrEffect =
  | "would_become_printed"
  | "remain_queued"
  | "already_terminal"
  | "missing_request";

export interface InternalGangSheetHistoricalReconciliationRequestEffect {
  printRequestId: string;
  requestName: string;
  effect: InternalGangSheetHistoricalReconciliationPrEffect;
  finishableAllocationCount: number;
  predictedQueueTab: "queued" | "printed" | "working" | "editing" | "printing" | null;
}

export interface PreviewInternalGangSheetHistoricalReconciliationResponse {
  upcomingShowId: string;
  sheetTitle: string;
  cycleNumber: number | null;
  productionStatus: string;
  canApply: boolean;
  blockers: string[];
  finishableAllocationCount: number;
  alreadyDoneAllocationCount: number;
  canceledAllocationCount: number;
  skippedAllocationCount: number;
  affectedPrintRequestCount: number;
  wouldBecomePrintedCount: number;
  remainQueuedCount: number;
  alreadyTerminalCount: number;
  requestEffects: InternalGangSheetHistoricalReconciliationRequestEffect[];
  previewChecksum: string;
  notes: string[];
}

export interface ApplyInternalGangSheetHistoricalReconciliationResponse {
  upcomingShowId: string;
  alreadyApplied: boolean;
  finishedAllocationCount: number;
  affectedPrintRequestIds: string[];
  becamePrintedCount: number;
  remainQueuedCount: number;
  notes: string[];
}
