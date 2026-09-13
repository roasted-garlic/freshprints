import {
  PREVIEW_MAX_HEIGHT_PX,
  PREVIEW_MAX_WIDTH_PX,
  PREVIEW_WEBP_QUALITY,
  THUMBNAIL_MAX_HEIGHT_PX,
  THUMBNAIL_MAX_WIDTH_PX,
  THUMBNAIL_WEBP_QUALITY,
} from "../../../packages/shared/src/constants/import/derivativeGeneration.constants";
import {
  buildImageQualitySizingMetadata,
  type ImageQualitySizingWarningCode,
} from "../../../packages/shared/src/utils/imageQualitySizingPolicy";
import type { ArtworkUpscalePassCount } from "../../../packages/shared/src/utils/manualArtworkEnhance";
import { getSharp } from "./lazySharp";

export interface ArtworkEnhanceProcessedOutput {
  productionPng: Buffer;
  widthPx: number;
  heightPx: number;
  previewWebp: Buffer;
  thumbnailWebp: Buffer;
  wasUpscaled: true;
  upscalePassCount: ArtworkUpscalePassCount;
  upscaleFactor: number;
  sizingWarningCode?: ImageQualitySizingWarningCode;
  approvedMaxPrintWidthInches: number;
  approvedMaxPrintHeightInches: number;
  sizingPolicyVersion: string;
  preEnhanceWidthPx: number;
  preEnhanceHeightPx: number;
}

async function encodeDerivative(
  productionPng: Buffer,
  maxWidth: number,
  maxHeight: number,
  quality: number,
): Promise<Buffer> {
  return getSharp()(productionPng, { failOn: "error" })
    .resize({
      width: maxWidth,
      height: maxHeight,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality, alphaQuality: quality })
    .toBuffer();
}

export async function processArtworkEnhancePng(params: {
  sourcePng: Buffer;
  sourceWidthPx: number;
  sourceHeightPx: number;
  targetWidthPx: number;
  targetHeightPx: number;
  nextUpscalePassCount: ArtworkUpscalePassCount;
  cumulativeUpscaleFactor: number;
  sizingWarningCode?: ImageQualitySizingWarningCode;
}): Promise<ArtworkEnhanceProcessedOutput> {
  const upscaledPng = await getSharp()(params.sourcePng, { failOn: "error" })
    .resize(params.targetWidthPx, params.targetHeightPx, {
      fit: "fill",
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();

  const [previewWebp, thumbnailWebp] = await Promise.all([
    encodeDerivative(upscaledPng, PREVIEW_MAX_WIDTH_PX, PREVIEW_MAX_HEIGHT_PX, PREVIEW_WEBP_QUALITY),
    encodeDerivative(
      upscaledPng,
      THUMBNAIL_MAX_WIDTH_PX,
      THUMBNAIL_MAX_HEIGHT_PX,
      THUMBNAIL_WEBP_QUALITY,
    ),
  ]);

  const sizingMeta = buildImageQualitySizingMetadata(params.targetWidthPx, params.targetHeightPx, {
    wasUpscaled: true,
    upscalePassCount: params.nextUpscalePassCount,
    upscaleFactor: params.cumulativeUpscaleFactor,
    sizingWarningCode: params.sizingWarningCode,
  });

  return {
    productionPng: upscaledPng,
    widthPx: params.targetWidthPx,
    heightPx: params.targetHeightPx,
    previewWebp,
    thumbnailWebp,
    wasUpscaled: true,
    upscalePassCount: params.nextUpscalePassCount,
    upscaleFactor: params.cumulativeUpscaleFactor,
    sizingWarningCode: params.sizingWarningCode,
    approvedMaxPrintWidthInches: sizingMeta.approvedMaxPrintWidthInches,
    approvedMaxPrintHeightInches: sizingMeta.approvedMaxPrintHeightInches,
    sizingPolicyVersion: sizingMeta.sizingPolicyVersion,
    preEnhanceWidthPx: params.sourceWidthPx,
    preEnhanceHeightPx: params.sourceHeightPx,
  };
}
