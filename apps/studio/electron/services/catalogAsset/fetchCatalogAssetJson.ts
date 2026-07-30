import { isAllowedFirebaseStorageDownloadUrl } from "../download/firebaseStorageDownloadUrl";
import type {
  CatalogAssetFailureStage,
  CatalogAssetFetchDiagnostics,
} from "@fresh-prints/shared/types/catalogAsset/catalogAssetIpc.types";

const MAX_CATALOG_ASSET_BYTES = 2 * 1024 * 1024;

/**
 * Fetches a public generated catalog JSON asset from Firebase Storage in the main process (plain
 * Node — no browser CORS enforcement), given a download URL the renderer already resolved via
 * `getDownloadURL()`. Only Firebase Storage hosts are accepted (same allowlist as
 * `downloadFirebaseStorageUrlToFile`), and the response is parsed here so the renderer never needs
 * its own `fetch()` against a cross-origin Storage URL — sidesteps packaged Electron's `file://`
 * renderer origin, which cannot safely be added to bucket CORS.
 */
export class CatalogAssetFetchError extends Error {
  constructor(
    message: string,
    readonly diagnostics: CatalogAssetFetchDiagnostics,
  ) {
    super(message);
    this.name = "CatalogAssetFetchError";
  }
}

function failure(
  startedAtMs: number,
  failureCode: string,
  failureStage: CatalogAssetFailureStage,
  message: string,
  httpStatus?: number,
): CatalogAssetFetchError {
  return new CatalogAssetFetchError(message, {
    durationMs: Date.now() - startedAtMs,
    failureCode,
    failureStage,
    ...(httpStatus === undefined ? {} : { httpStatus }),
  });
}

export async function fetchCatalogAssetJson(
  downloadUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{
  diagnostics: CatalogAssetFetchDiagnostics;
  json: unknown;
}> {
  const startedAtMs = Date.now();
  if (!isAllowedFirebaseStorageDownloadUrl(downloadUrl)) {
    throw failure(
      startedAtMs,
      "storage-host-denied",
      "host-allowlist",
      "Only Firebase Storage download URLs can be fetched.",
    );
  }

  let response: Response;
  try {
    response = await fetchImpl(downloadUrl);
  } catch {
    throw failure(
      startedAtMs,
      "storage-http-request-failed",
      "http-request",
      "Catalog asset request could not be completed.",
    );
  }
  if (!response.ok) {
    throw failure(
      startedAtMs,
      "storage-http-status",
      "http-status",
      `Catalog asset request failed (${response.status}).`,
      response.status,
    );
  }

  const text = await response.text();
  if (Buffer.byteLength(text, "utf8") > MAX_CATALOG_ASSET_BYTES) {
    throw failure(
      startedAtMs,
      "storage-response-too-large",
      "response-size",
      "Catalog asset exceeded its 2 MiB safety limit.",
      response.status,
    );
  }

  try {
    return {
      diagnostics: { durationMs: Date.now() - startedAtMs, httpStatus: response.status },
      json: JSON.parse(text) as unknown,
    };
  } catch {
    throw failure(
      startedAtMs,
      "storage-json-invalid",
      "json-parsing",
      "Catalog asset response was not valid JSON.",
      response.status,
    );
  }
}
