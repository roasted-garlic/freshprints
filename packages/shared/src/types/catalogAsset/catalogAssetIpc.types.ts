export type CatalogAssetFailureStage =
  | "electron-ipc"
  | "host-allowlist"
  | "http-request"
  | "http-status"
  | "json-parsing"
  | "response-size";

export interface CatalogAssetFetchDiagnostics {
  durationMs: number;
  failureCode?: string;
  failureStage?: CatalogAssetFailureStage;
  httpStatus?: number;
}

/**
 * Studio-only IPC bridge for fetching public generated catalog JSON assets
 * (`generated/portal-catalog/**`, `generated/catalog-reference/**`) through Electron's main
 * process instead of a renderer `fetch()`. Packaged Electron's `file://` renderer origin makes
 * browser CORS unreliable/unsafe to extend for this case (see the Wave C Plan amendment); routing
 * through main (plain Node, no CORS enforcement) avoids that entirely and requires no bucket CORS
 * change. The main-process handler only accepts a download URL already resolved by the renderer's
 * `getDownloadURL()` call and validates its host before fetching (same allowlist as
 * `downloadFirebaseStorageUrlToFile`).
 */
export interface FetchCatalogAssetJsonRequest {
  downloadUrl: string;
}

export interface FetchCatalogAssetJsonResult {
  diagnostics: CatalogAssetFetchDiagnostics;
  json: unknown;
}

export type FetchCatalogAssetJsonIpcResult =
  | { success: true; data: FetchCatalogAssetJsonResult }
  | {
      success: false;
      error: {
        code: "CATALOG_ASSET_FETCH_FAILED" | "INVALID_INPUT";
        message: string;
        diagnostics: CatalogAssetFetchDiagnostics;
      };
    };

export interface FreshPrintsCatalogAssetApi {
  fetchJson(
    request: FetchCatalogAssetJsonRequest,
  ): Promise<FetchCatalogAssetJsonIpcResult>;
}
