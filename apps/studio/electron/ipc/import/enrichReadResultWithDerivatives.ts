import type { ReadSelectedPngFileBytesResult } from "@fresh-prints/shared/types/import/importIpc.types";
import { derivativeGenerationService } from "../../services/import/derivativeGenerationService";

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

  const derivativeOutcome = await derivativeGenerationService.generateFromPngBytes({
    pngBytes: result.bytes,
    fileName: result.fileName,
    fileSizeBytes: result.fileSizeBytes,
  });

  if (!derivativeOutcome.success) {
    return {
      ...result,
      derivativeError: derivativeOutcome.error,
    };
  }

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
