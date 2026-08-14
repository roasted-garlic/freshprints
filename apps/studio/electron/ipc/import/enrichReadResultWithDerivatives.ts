import type { ReadSelectedPngFileBytesResult } from "@fresh-prints/shared/types/import/importIpc.types";
import { derivativeGenerationService } from "../../services/import/derivativeGenerationService";
import { logDerivativeLocusDiag } from "../../services/import/derivativeLocusDiagnostic";

/**
 * When includeDerivatives is true, generates thumbnail/preview WebP in main process
 * from the already-read PNG bytes. Original bytes are always preserved on the result.
 *
 * Derivative failure does not throw — returns derivativeError for Step 5+ partial success.
 */
export async function enrichReadResultWithDerivatives(
  result: ReadSelectedPngFileBytesResult,
  includeDerivatives: boolean,
): Promise<ReadSelectedPngFileBytesResult> {
  if (!includeDerivatives) {
    return result;
  }

  logDerivativeLocusDiag({
    stage: "main.derivatives.start",
    fileName: result.fileName,
    detail: { sourceByteLength: result.bytes.byteLength },
  });

  const derivativeOutcome = await derivativeGenerationService.generateFromPngBytes({
    pngBytes: result.bytes,
    fileName: result.fileName,
    fileSizeBytes: result.fileSizeBytes,
  });

  if (!derivativeOutcome.success) {
    logDerivativeLocusDiag({
      stage: "main.derivatives.fail",
      fileName: result.fileName,
      ok: false,
      detail: {
        code: derivativeOutcome.error.code,
        message: derivativeOutcome.error.message,
      },
    });
    return {
      ...result,
      derivativeError: derivativeOutcome.error,
    };
  }

  logDerivativeLocusDiag({
    stage: "main.derivatives.success",
    fileName: result.fileName,
    ok: true,
    detail: {
      thumbnailByteLength: derivativeOutcome.data.thumbnail.byteLength,
      previewByteLength: derivativeOutcome.data.preview.byteLength,
      thumbnailCtor: derivativeOutcome.data.thumbnailBytes.constructor.name,
      previewCtor: derivativeOutcome.data.previewBytes.constructor.name,
    },
  });

  return {
    ...result,
    derivatives: {
      thumbnailBytes: derivativeOutcome.data.thumbnailBytes,
      previewBytes: derivativeOutcome.data.previewBytes,
      thumbnail: derivativeOutcome.data.thumbnail,
      preview: derivativeOutcome.data.preview,
    },
  };
}
