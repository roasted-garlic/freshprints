import path from "node:path";

export interface CorrectedImportBytes {
  bytes: Buffer;
  width: number;
  height: number;
}

const cacheByPath = new Map<string, CorrectedImportBytes>();

/**
 * Caches the trimmed-and/or-upscaled PNG buffer produced during validation,
 * keyed by file path, so the later byte-read step can reuse it instead of
 * re-running sharp. Consumed (read-once) rather than long-lived: the normal
 * flow always validates immediately before reading bytes, so there's no
 * reason to keep entries around longer than that single round-trip.
 */
export function cacheCorrectedImportBytes(filePath: string, result: CorrectedImportBytes): void {
  cacheByPath.set(path.normalize(filePath), result);
}

export function consumeCorrectedImportBytes(filePath: string): CorrectedImportBytes | undefined {
  const normalizedPath = path.normalize(filePath);
  const cached = cacheByPath.get(normalizedPath);

  if (cached) {
    cacheByPath.delete(normalizedPath);
  }

  return cached;
}
