import type {
  BackfillPrintRequestQueueTabRequest,
  BackfillPrintRequestQueueTabResponse,
} from "@fresh-prints/shared/types/admin/backfillPrintRequestQueueTab.types";

export interface ReconcilePortalCatalogAlgoliaIndexRequest {
  dryRun?: boolean;
}

export interface ReconcilePortalCatalogAlgoliaIndexResponse {
  scanned: number;
  upserted: number;
  cleared: boolean;
  dryRun: boolean;
}

export interface RebuildTaxonomyMaterializationResponse {
  revision: number;
  chunkCount: number;
  tagCount: number;
  categoryCount: number;
  contentHash: string;
  corpusBytes: number;
}

/**
 * Single source of truth for the `window.freshPrintsDev` development console surface.
 */
declare global {
  interface Window {
    freshPrintsDev?: {
      backfillPrintRequestQueueTab?: (
        payload: BackfillPrintRequestQueueTabRequest,
      ) => Promise<BackfillPrintRequestQueueTabResponse>;
      reconcilePortalCatalogAlgoliaIndex?: (
        payload?: ReconcilePortalCatalogAlgoliaIndexRequest,
      ) => Promise<ReconcilePortalCatalogAlgoliaIndexResponse>;
      rebuildTaxonomyMaterialization?: () => Promise<RebuildTaxonomyMaterializationResponse>;
    };
  }
}

export {};
