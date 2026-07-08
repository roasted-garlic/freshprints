import { PNG_MAGIC_BYTES } from "@fresh-prints/shared/constants/importValidation.constants";
import { MAX_SINGLE_PNG_SIZE_BYTES } from "@fresh-prints/shared/constants/importValidation.constants";
import { isWebpMagicBytes } from "@fresh-prints/shared/utils/derivativeWebpValidation";
import { formatPngSizeLimitExceededMessage } from "@fresh-prints/shared/utils/importLimitMessages";

export { isWebpMagicBytes };
import type {
  DerivativeGenerationFailure,
  DerivativeGenerationRequest,
} from "@fresh-prints/shared/types/import/derivativeGeneration.types";

export function isPngMagicBytes(bytes: Uint8Array): boolean {
  if (bytes.byteLength < PNG_MAGIC_BYTES.length) {
    return false;
  }

  return PNG_MAGIC_BYTES.every((byte, index) => bytes[index] === byte);
}

export function validateDerivativeGenerationRequest(
  request: DerivativeGenerationRequest,
): DerivativeGenerationFailure | null {
  if (!request || typeof request !== "object") {
    return {
      code: "INVALID_INPUT",
      message: "A derivative generation request is required.",
    };
  }

  const { pngBytes, fileName, fileSizeBytes } = request;

  if (!(pngBytes instanceof Uint8Array) || pngBytes.byteLength === 0) {
    return {
      code: "INVALID_INPUT",
      message: "PNG bytes are required for derivative generation.",
    };
  }

  if (typeof fileName !== "string" || fileName.trim().length === 0) {
    return {
      code: "INVALID_INPUT",
      message: "A source file name is required for derivative generation.",
    };
  }

  if (typeof fileSizeBytes !== "number" || !Number.isFinite(fileSizeBytes) || fileSizeBytes <= 0) {
    return {
      code: "INVALID_INPUT",
      message: "A valid source file size is required for derivative generation.",
    };
  }

  if (fileSizeBytes !== pngBytes.byteLength) {
    return {
      code: "INVALID_INPUT",
      message: "The reported PNG file size does not match the provided bytes.",
    };
  }

  if (pngBytes.byteLength > MAX_SINGLE_PNG_SIZE_BYTES) {
    return {
      code: "FILE_TOO_LARGE",
      message: formatPngSizeLimitExceededMessage(),
    };
  }

  if (!isPngMagicBytes(pngBytes)) {
    return {
      code: "INVALID_PNG",
      message: "The provided bytes are not a valid PNG file.",
    };
  }

  return null;
}
