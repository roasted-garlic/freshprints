import { loadSharpModule } from "../import/loadSharpModule";
import type {
  ShowExportImageStep,
  ShowExportImageWarning,
} from "@fresh-prints/shared/types/export/showExportIpc.types";

export interface ResizedExportImage {
  fileName: string;
  pngBytes: Buffer;
  warning: ShowExportImageWarning | null;
}

export type DownloadAndResizeExportImageResult =
  | { success: true; data: ResizedExportImage }
  | { success: false; warning: ShowExportImageWarning };

export type ExportImageStepCallback = (step: ShowExportImageStep) => void;

async function downloadImageBytes(downloadUrl: string): Promise<Buffer> {
  const response = await fetch(downloadUrl);

  if (!response.ok) {
    throw new Error(`Download failed with status ${response.status}.`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Downloads one export image from its Firebase Storage download URL, then resizes it (in memory
 * only — the canonical original is never touched) to the requested fixed-300-DPI target pixel
 * size. The source is already trimmed of transparent edge padding at import time, so no trim
 * step is needed here. Upscales when the source has fewer pixels than the target in either
 * dimension, per the approved export-fidelity decision, and reports that as an informational
 * warning rather than a failure. Any download or resize failure is reported as a skip-and-warn
 * result rather than thrown, so one bad image never aborts the whole export. `onStep` is called
 * as each step starts, for renderer-facing progress reporting.
 */
export async function downloadAndResizeExportImage(
  downloadUrl: string,
  targetWidthPx: number,
  targetHeightPx: number,
  fileName: string,
  onStep: ExportImageStepCallback = () => undefined,
): Promise<DownloadAndResizeExportImageResult> {
  let sourceBuffer: Buffer;

  onStep("downloading");

  try {
    sourceBuffer = await downloadImageBytes(downloadUrl);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown download error.";
    return {
      success: false,
      warning: {
        fileName,
        reason: "download_failed",
        message: `Could not download the original image: ${detail}`,
      },
    };
  }

  try {
    const sharpApi = await loadSharpModule();

    onStep("resizing");

    const sourceMetadata = await sharpApi(sourceBuffer).metadata();
    const sourceWidthPx = sourceMetadata.width ?? 0;
    const sourceHeightPx = sourceMetadata.height ?? 0;
    const needsUpscale = sourceWidthPx < targetWidthPx || sourceHeightPx < targetHeightPx;

    const pngBytes = await sharpApi(sourceBuffer)
      .resize(targetWidthPx, targetHeightPx, { fit: "fill", withoutEnlargement: false })
      .png()
      .toBuffer();

    return {
      success: true,
      data: {
        fileName,
        pngBytes,
        warning: needsUpscale
          ? {
              fileName,
              reason: "upscaled",
              message: `Image (${sourceWidthPx}x${sourceHeightPx}px) was smaller than the required ${targetWidthPx}x${targetHeightPx}px at 300 DPI and was upscaled to match the requested print size.`,
            }
          : null,
      },
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown image processing error.";
    return {
      success: false,
      warning: {
        fileName,
        reason: "resize_failed",
        message: `Could not resize the image: ${detail}`,
      },
    };
  }
}
