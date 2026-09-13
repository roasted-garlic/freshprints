import { readFileSync } from "node:fs";

import { nativeImage } from "electron";

import { MAX_SINGLE_PNG_SIZE_BYTES } from "@fresh-prints/shared/constants/importValidation.constants";
import { suggestDarkArtworkBackgroundFromPngBytes } from "@fresh-prints/shared/utils/importArtworkBackgroundDetection";

import { loadSharpModule } from "../../services/import/loadSharpModule";
import { logDerivativeLocusDiag } from "../../services/import/derivativeLocusDiagnostic";

export const PNG_PREVIEW_MAX_WIDTH_PX = 320;

export interface SelectedPngPreviewResult {
  dataUrl: string;
  previewHeight: number;
  previewWidth: number;
  /** Present when Auto detector recommends dark mat (display only). */
  suggestDarkArtworkBackground?: boolean;
}

export function getSelectedPngPreview(filePath: string): SelectedPngPreviewResult | null {
  const image = nativeImage.createFromPath(filePath);

  if (image.isEmpty()) {
    return null;
  }

  const { width, height } = image.getSize();

  if (width <= 0 || height <= 0) {
    return null;
  }

  const previewImage =
    width > PNG_PREVIEW_MAX_WIDTH_PX
      ? image.resize({ width: PNG_PREVIEW_MAX_WIDTH_PX })
      : image;

  const previewSize = previewImage.getSize();
  const dataUrl = previewImage.toDataURL();

  if (!dataUrl) {
    return null;
  }

  return {
    dataUrl,
    previewWidth: previewSize.width,
    previewHeight: previewSize.height,
  };
}

/**
 * Preview + visibility detector so Imports UI can show Auto → Light/Dark before upload.
 */
export async function getSelectedPngPreviewWithBackgroundHint(
  filePath: string,
): Promise<SelectedPngPreviewResult | null> {
  const preview = getSelectedPngPreview(filePath);
  if (!preview) {
    return null;
  }

  try {
    const pngBytes = readFileSync(filePath);
    const sharp = await loadSharpModule();
    const suggestDark = await suggestDarkArtworkBackgroundFromPngBytes(sharp, pngBytes);
    if (suggestDark === true) {
      return { ...preview, suggestDarkArtworkBackground: true };
    }
  } catch (error) {
    logDerivativeLocusDiag({
      stage: "main.artworkBg.previewDetect.fail",
      fileName: filePath,
      ok: false,
      detail: {
        message: error instanceof Error ? error.message : "preview background detect failed",
      },
    });
  }

  return preview;
}

export function isPreviewablePngSize(fileSizeBytes: number): boolean {
  return fileSizeBytes <= MAX_SINGLE_PNG_SIZE_BYTES;
}
