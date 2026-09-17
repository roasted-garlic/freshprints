import { statSync } from "node:fs";
import path from "node:path";

export interface CorrectedImportBytes {
  bytes: Buffer;
  width: number;
  height: number;
}

const cacheByKey = new Map<string, CorrectedImportBytes>();

/**
 * Key by path + size + mtime so replace-in-place at the same path cannot reuse
 * corrected bytes from a previous file revision.
 */
export function buildCorrectedImportBytesCacheKey(filePath: string): string {
  const normalizedPath = path.normalize(filePath);
  try {
    const stats = statSync(normalizedPath);
    return `${normalizedPath}@${stats.size}@${stats.mtimeMs}`;
  } catch {
    return normalizedPath;
  }
}

/**
 * Caches the trimmed-and/or-upscaled PNG buffer produced during validation,
 * keyed by file fingerprint, so the later byte-read step can reuse it instead of
 * re-running sharp. Consumed (read-once) rather than long-lived: the normal
 * flow always validates immediately before reading bytes, so there's no
 * reason to keep entries around longer than that single round-trip.
 */
export function cacheCorrectedImportBytes(filePath: string, result: CorrectedImportBytes): void {
  cacheByKey.set(buildCorrectedImportBytesCacheKey(filePath), result);
}

export function consumeCorrectedImportBytes(filePath: string): CorrectedImportBytes | undefined {
  const key = buildCorrectedImportBytesCacheKey(filePath);
  const cached = cacheByKey.get(key);

  if (cached) {
    cacheByKey.delete(key);
  }

  return cached;
}

/** @internal test helper */
export function clearCorrectedImportBytesCache(): void {
  cacheByKey.clear();
}
