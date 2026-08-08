/**
 * Electron userData taxonomy materialization disk cache (RC6).
 * Path: `{userData}/taxonomy-cache/v{schemaVersion}.json`
 */

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { app } from "electron";

import { TAXONOMY_MATERIALIZATION_SCHEMA_VERSION } from "@fresh-prints/shared/types/taxonomy/taxonomyMaterialization.types";

export interface TaxonomyUserDataCachePayload {
  revision: number;
  contentHash: string;
  schemaVersion: number;
  categories: unknown[];
  tags: unknown[];
  savedAtMs: number;
}

function resolveTaxonomyCacheDir(): string {
  return path.join(app.getPath("userData"), "taxonomy-cache");
}

export function resolveTaxonomyCacheFilePath(
  schemaVersion: number = TAXONOMY_MATERIALIZATION_SCHEMA_VERSION,
): string {
  return path.join(resolveTaxonomyCacheDir(), `v${schemaVersion}.json`);
}

export async function readTaxonomyUserDataCache(): Promise<TaxonomyUserDataCachePayload | null> {
  try {
    const raw = await readFile(resolveTaxonomyCacheFilePath(), "utf8");
    const parsed = JSON.parse(raw) as TaxonomyUserDataCachePayload;
    if (
      !parsed ||
      typeof parsed.revision !== "number" ||
      typeof parsed.contentHash !== "string" ||
      !Array.isArray(parsed.tags) ||
      !Array.isArray(parsed.categories)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function writeTaxonomyUserDataCache(
  payload: TaxonomyUserDataCachePayload,
): Promise<void> {
  const dir = resolveTaxonomyCacheDir();
  await mkdir(dir, { recursive: true });
  await writeFile(resolveTaxonomyCacheFilePath(payload.schemaVersion), JSON.stringify(payload), "utf8");
}

export async function clearTaxonomyUserDataCache(): Promise<void> {
  await rm(resolveTaxonomyCacheDir(), { recursive: true, force: true });
}
