import {
  PREVIEW_MAX_HEIGHT_PX,
  PREVIEW_MAX_WIDTH_PX,
  PREVIEW_WEBP_QUALITY,
  THUMBNAIL_MAX_HEIGHT_PX,
  THUMBNAIL_MAX_WIDTH_PX,
  THUMBNAIL_WEBP_QUALITY,
} from "../../../shared/constants/import/derivativeGeneration.constants";
import type {
  DerivativeGenerationFailure,
  DerivativeGenerationOutcome,
  DerivativeGenerationRequest,
} from "../../../shared/types/import/derivativeGeneration.types";
import { derivativeConcurrencyQueue } from "./derivativeConcurrencyQueue";
import { encodeWebpDerivative } from "./encodeWebpDerivative";
import { validateDerivativeGenerationRequest } from "./derivativePngValidation";
import { loadSharpModule } from "./loadSharpModule";

function mapUnexpectedFailure(error: unknown): DerivativeGenerationFailure {
  const detail = error instanceof Error ? error.message : "An unexpected error occurred.";

  return {
    code: "PROCESSING_FAILED",
    message: `Derivative generation failed: ${detail}`,
  };
}

function isDerivativeGenerationFailure(error: unknown): error is DerivativeGenerationFailure {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    typeof (error as DerivativeGenerationFailure).code === "string" &&
    typeof (error as DerivativeGenerationFailure).message === "string"
  );
}

async function generateDerivativesFromValidatedInput(
  request: DerivativeGenerationRequest,
): Promise<DerivativeGenerationOutcome> {
  const inputBuffer = Buffer.from(request.pngBytes);

  let sharpModule;

  try {
    sharpModule = await loadSharpModule();
  } catch (error) {
    if (isDerivativeGenerationFailure(error)) {
      return { success: false, error };
    }

    return { success: false, error: mapUnexpectedFailure(error) };
  }

  const thumbnailResult = await encodeWebpDerivative(sharpModule, inputBuffer, {
    label: "Thumbnail",
    maxWidth: THUMBNAIL_MAX_WIDTH_PX,
    maxHeight: THUMBNAIL_MAX_HEIGHT_PX,
    quality: THUMBNAIL_WEBP_QUALITY,
  });

  if (!thumbnailResult.success) {
    return thumbnailResult;
  }

  const previewResult = await encodeWebpDerivative(sharpModule, inputBuffer, {
    label: "Preview",
    maxWidth: PREVIEW_MAX_WIDTH_PX,
    maxHeight: PREVIEW_MAX_HEIGHT_PX,
    quality: PREVIEW_WEBP_QUALITY,
  });

  if (!previewResult.success) {
    return previewResult;
  }

  return {
    success: true,
    data: {
      thumbnailBytes: thumbnailResult.data.bytes,
      previewBytes: previewResult.data.bytes,
      thumbnail: {
        format: "webp",
        quality: THUMBNAIL_WEBP_QUALITY,
        width: thumbnailResult.data.width,
        height: thumbnailResult.data.height,
        byteLength: thumbnailResult.data.byteLength,
      },
      preview: {
        format: "webp",
        quality: PREVIEW_WEBP_QUALITY,
        width: previewResult.data.width,
        height: previewResult.data.height,
        byteLength: previewResult.data.byteLength,
      },
    },
  };
}

/**
 * Main-process derivative generation service (Phase 3C).
 *
 * - Accepts validated PNG bytes from the session-gated read handler
 * - Runs sharp resize/encode behind DERIVATIVE_PROCESSING_CONCURRENCY queue
 * - Produces WebP thumbnail and preview buffers
 * - Preserves alpha; downscale only (no upscaling)
 * - Never modifies source PNG bytes
 */
export const derivativeGenerationService = {
  async generateFromPngBytes(
    request: DerivativeGenerationRequest,
  ): Promise<DerivativeGenerationOutcome> {
    const validationError = validateDerivativeGenerationRequest(request);

    if (validationError) {
      return { success: false, error: validationError };
    }

    try {
      return await derivativeConcurrencyQueue.run(() => generateDerivativesFromValidatedInput(request));
    } catch (error) {
      if (isDerivativeGenerationFailure(error)) {
        return { success: false, error };
      }

      return { success: false, error: mapUnexpectedFailure(error) };
    }
  },
};
