import type {
  BackfillPrintRequestQueueTabRequest,
  BackfillPrintRequestQueueTabResponse,
} from "@fresh-prints/shared/types/admin/backfillPrintRequestQueueTab.types";

/**
 * Single source of truth for the `window.freshPrintsDev` development console surface.
 */
declare global {
  interface Window {
    freshPrintsDev?: {
      backfillPrintRequestQueueTab?: (
        payload: BackfillPrintRequestQueueTabRequest,
      ) => Promise<BackfillPrintRequestQueueTabResponse>;
    };
  }
}

export {};
