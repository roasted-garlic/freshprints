import type { ImportIpcResult } from "../import/importIpc.types";

export interface TaxonomyDiskCacheReadResult {
  cache: {
    revision: number;
    contentHash: string;
    schemaVersion: number;
    categories: unknown[];
    tags: unknown[];
    savedAtMs: number;
  } | null;
}

export interface TaxonomyDiskCacheWriteRequest {
  revision: number;
  contentHash: string;
  schemaVersion: number;
  categories: unknown[];
  tags: unknown[];
  savedAtMs: number;
}

export interface TaxonomyDiskCacheWriteResult {
  written: boolean;
}

export interface TaxonomyDiskCacheClearResult {
  cleared: boolean;
}

export interface FreshPrintsTaxonomyCacheApi {
  readDiskCache(): Promise<ImportIpcResult<TaxonomyDiskCacheReadResult>>;
  writeDiskCache(
    request: TaxonomyDiskCacheWriteRequest,
  ): Promise<ImportIpcResult<TaxonomyDiskCacheWriteResult>>;
  clearDiskCache(): Promise<ImportIpcResult<TaxonomyDiskCacheClearResult>>;
}
