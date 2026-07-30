import type { CatalogSnapshotPublicationResult } from "./catalogSnapshotAdminService";
import type {
  BackfillPrintRequestQueueTabRequest,
  BackfillPrintRequestQueueTabResponse,
} from "@fresh-prints/shared/types/admin/backfillPrintRequestQueueTab.types";

/**
 * Single source of truth for the `window.freshPrintsDev` development console surface.
 * TypeScript requires every `declare global` augmentation of the same interface to be
 * structurally identical, so every dev-only console method is added here (not redeclared
 * per-file) as it's introduced — see `catalogSnapshotAdminService.ts` and
 * `printRequestQueueTabBackfillAdminService.ts` for the current installers.
 */
declare global {
  interface Window {
    freshPrintsDev?: {
      rebuildCatalogSnapshots?: () => Promise<CatalogSnapshotPublicationResult>;
      backfillPrintRequestQueueTab?: (
        payload: BackfillPrintRequestQueueTabRequest,
      ) => Promise<BackfillPrintRequestQueueTabResponse>;
    };
  }
}

export {};
