/** Pick a stable daily index into a sample (cache-friendly rotation). */
export function pickDailyRotatedIndex(sampleSize: number, nowMs: number = Date.now()): number {
  if (sampleSize <= 0) {
    return 0
  }
  const unixDay = Math.floor(nowMs / (24 * 60 * 60 * 1000))
  return unixDay % sampleSize
}

/** Newest-ready sample size for global OG image rotation. */
export const PORTAL_GLOBAL_OG_LIBRARY_SAMPLE_SIZE = 40
