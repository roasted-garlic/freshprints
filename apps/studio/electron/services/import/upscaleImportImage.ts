import { loadSharpModule } from "./loadSharpModule";
import {
  resolveImportUpscaleDecision,
  resolveImportUpscaleTargetPx,
} from "@fresh-prints/shared/utils/printSizeMath";
import type { ImageQualitySizingWarningCode } from "@fresh-prints/shared/utils/imageQualitySizingPolicy";

export interface UpscaleImportImageResult {
  bytes: Buffer;
  width: number;
  height: number;
  wasUpscaled: boolean;
  originalWidth: number;
  originalHeight: number;
  upscaleFactor: number;
  upscalePassCount: 0 | 1;
  sizingWarningCode?: ImageQualitySizingWarningCode;
}

/**
 * Upscales a PNG once under the shared image-quality policy (ADR-FP-080):
 * aspect-locked ~12″ target, ≤6.0×, never downsample. Returns original bytes
 * when no upscale is needed.
 */
export async function upscaleImportImageIfNeeded(
  pngBytes: Buffer,
  pixelWidth: number,
  pixelHeight: number,
): Promise<UpscaleImportImageResult> {
  const decision = resolveImportUpscaleDecision(pixelWidth, pixelHeight);
  const target = resolveImportUpscaleTargetPx(pixelWidth, pixelHeight);

  if (!target || !decision.wasUpscaled) {
    return {
      bytes: pngBytes,
      width: pixelWidth,
      height: pixelHeight,
      wasUpscaled: false,
      originalWidth: pixelWidth,
      originalHeight: pixelHeight,
      upscaleFactor: 1,
      upscalePassCount: 0,
      ...(decision.sizingWarningCode ? { sizingWarningCode: decision.sizingWarningCode } : {}),
    };
  }

  const sharpApi = await loadSharpModule();
  const upscaledBytes = await sharpApi(pngBytes)
    .resize(target.widthPx, target.heightPx, { fit: "fill", withoutEnlargement: false })
    .png()
    .toBuffer();

  return {
    bytes: upscaledBytes,
    width: target.widthPx,
    height: target.heightPx,
    wasUpscaled: true,
    originalWidth: pixelWidth,
    originalHeight: pixelHeight,
    upscaleFactor: decision.upscaleFactor,
    upscalePassCount: 1,
    ...(decision.sizingWarningCode ? { sizingWarningCode: decision.sizingWarningCode } : {}),
  };
}
