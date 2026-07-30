export const BACKFILL_PRINT_REQUEST_QUEUE_TAB_CONFIRMATION_PHRASE = "BACKFILL QUEUE TAB" as const;

export interface BackfillPrintRequestQueueTabRequest {
  dryRun: boolean;
  confirmationPhrase: typeof BACKFILL_PRINT_REQUEST_QUEUE_TAB_CONFIRMATION_PHRASE;
  startAfterRequestId?: string;
  pageLimit?: number;
}

export interface BackfillPrintRequestQueueTabResponse {
  dryRun: boolean;
  scanned: number;
  alreadyCorrect: number;
  updated: number;
  itemsAndAllocationsReadOperations: number;
  hasMore: boolean;
  nextStartAfterRequestId: string | null;
}
