/**
 * Encoded Playground image payload sizing for Gen2 callable transport safety.
 * Base64 expands raw bytes by 4/3 (padding to a multiple of 3).
 */
export function estimateBase64EncodedByteLength(rawByteLength: number): number {
  if (!Number.isFinite(rawByteLength) || rawByteLength <= 0) {
    return 0;
  }
  return Math.ceil(rawByteLength / 3) * 4;
}

export function encodedImageFitsPlaygroundCallableLimit(
  rawByteLength: number,
  safeEncodedLimitBytes: number,
): boolean {
  return estimateBase64EncodedByteLength(rawByteLength) <= safeEncodedLimitBytes;
}
