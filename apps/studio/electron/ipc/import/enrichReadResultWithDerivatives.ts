import { suggestDarkArtworkBackgroundFromPngBytes } from "@fresh-prints/shared/utils/importArtworkBackgroundDetection";
import type { ReadSelectedPngFileBytesResult } from "@fresh-prints/shared/types/import/importIpc.types";
import { derivativeGenerationService } from "../../services/import/derivativeGenerationService";
import { logDerivativeLocusDiag } from "../../services/import/derivativeLocusDiagnostic";
import { loadSharpModule } from "../../services/import/loadSharpModule";

/**
 * Conservative light-art → dark mat hint for import Auto background.
 * Prefer false / omit on any failure (never throw into the import path).
 */
async function detectSuggestDarkArtworkBackground(
  pngBytes: Uint8Array,
  fileName: string,
): Promise<boolean | undefined> {
  try {
    const sharp = await loadSharpModule();
    const suggestDark = await suggestDarkArtworkBackgroundFromPngBytes(sharp, pngBytes);
    return suggestDark === true ? true : undefined;
  } catch (error) {
    logDerivativeLocusDiag({
      stage: "main.artworkBg.detect.fail",
      fileName,
      ok: false,
      detail: {
        message: error instanceof Error ? error.message : "artwork background detect failed",
      },
    });
    return undefined;
  }
}

/**
 * When includeDerivatives is true, generates thumbnail/preview WebP in main process
 * from the already-read PNG bytes. Original bytes are always preserved on the result.
 *
 * Derivative failure does not throw — returns derivativeError for Step 5+ partial success.
 * Also runs conservative light-art background detection (display mat only; not halftone).
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

  const suggestDarkArtworkBackground = await detectSuggestDarkArtworkBackground(
    result.bytes,
    result.fileName,
  );

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
      ...(suggestDarkArtworkBackground === true ? { suggestDarkArtworkBackground: true } : {}),
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
      suggestDarkArtworkBackground: suggestDarkArtworkBackground === true,
    },
  });

  return {
    ...result,
    ...(suggestDarkArtworkBackground === true ? { suggestDarkArtworkBackground: true } : {}),
    derivatives: {
      thumbnailBytes: derivativeOutcome.data.thumbnailBytes,
      previewBytes: derivativeOutcome.data.previewBytes,
      thumbnail: derivativeOutcome.data.thumbnail,
      preview: derivativeOutcome.data.preview,
    },
  };
}
