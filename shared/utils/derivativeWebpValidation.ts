import { MAX_DERIVATIVE_FILE_SIZE_BYTES } from "../constants/import/derivativeGeneration.constants";

export function isWebpMagicBytes(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 12) {
    return false;
  }

  const riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  const webp = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);

  return riff === "RIFF" && webp === "WEBP";
}

/**
 * Client-side validation before derivative WebP upload (Phase 3C).
 * Throws user-safe Error messages; does not perform network I/O.
 */
export function assertValidDerivativeWebpUploadBytes(bytes: Uint8Array): void {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0) {
    throw new Error("Derivative WebP bytes are required before upload.");
  }

  if (bytes.byteLength > MAX_DERIVATIVE_FILE_SIZE_BYTES) {
    throw new Error(
      `The derivative WebP file exceeds the maximum allowed size of ${MAX_DERIVATIVE_FILE_SIZE_BYTES} bytes.`,
    );
  }

  if (!isWebpMagicBytes(bytes)) {
    throw new Error("The provided bytes are not a valid WebP file.");
  }
}
