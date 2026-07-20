import type { Metadata } from "sharp";

import {
  CUSTOMER_UPLOAD_MAX_DIMENSION_PX,
  CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES,
  CUSTOMER_UPLOAD_MAX_TOTAL_PIXELS,
} from "../../../packages/shared/src/constants/customerUpload/customerUploadLimits.constants";
import {
  PREVIEW_MAX_HEIGHT_PX,
  PREVIEW_MAX_WIDTH_PX,
  PREVIEW_WEBP_QUALITY,
  THUMBNAIL_MAX_HEIGHT_PX,
  THUMBNAIL_MAX_WIDTH_PX,
  THUMBNAIL_WEBP_QUALITY,
} from "../../../packages/shared/src/constants/import/derivativeGeneration.constants";
import type { CustomerUploadSourceFormat } from "../../../packages/shared/src/types/customerUpload/customerUpload.enums";
import type { CustomerUploadTechnicalFailureCode } from "../../../packages/shared/src/types/customerUpload/customerUpload.enums";
import type { CustomerUploadTechnicalProgressStage } from "../../../packages/shared/src/types/customerUpload/customerUpload.enums";
import { buildImportPrintSizeCreateFields } from "../../../packages/shared/src/utils/importPrintSizeMetadata";
import { formatFileSize } from "../../../packages/shared/src/utils/formatFileSize";
import {
  assessPrintSizeCapability,
  resolveImportUpscaleDecision,
  resolveImportUpscaleTargetPx,
} from "../../../packages/shared/src/utils/printSizeMath";
import { buildImageQualitySizingMetadata } from "../../../packages/shared/src/utils/imageQualitySizingPolicy";
import {
  assessMeaningfulTransparency,
  CUSTOMER_UPLOAD_MIN_TRANSPARENT_PIXEL_RATIO,
  CUSTOMER_UPLOAD_MIN_TRIM_SHRINK_RATIO,
  CUSTOMER_UPLOAD_TRANSPARENT_ALPHA_MAX,
} from "../../../packages/shared/src/utils/customerUploadTransparency";

import { storageObjectPath } from "./storageObjectPath";

export { storageObjectPath };

/** Lazy-load native sharp — keep deploy discovery off the cold native require path. */
function getSharp(): typeof import("sharp") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("sharp") as typeof import("sharp");
}

export interface CustomerUploadProcessingSuccess {
  ok: true;
  sourceFormat: CustomerUploadSourceFormat;
  sourceWidthPx: number;
  sourceHeightPx: number;
  widthPx: number;
  heightPx: number;
  wasUpscaled: boolean;
  wasTrimmed: boolean;
  upscaleFactor: number;
  upscalePassCount: 0 | 1;
  approvedMaxPrintWidthInches: number;
  approvedMaxPrintHeightInches: number;
  sizingPolicyVersion: string;
  sizingWarningCode?: string;
  /** True when production bytes are identical to the uploaded source (skip re-encode + prefer Storage copy). */
  productionReusedSource: boolean;
  transparencyPassed: true;
  transparentPixelRatio: number;
  productionPng: Buffer;
  previewWebp: Buffer;
  thumbnailWebp: Buffer;
  printWidthInches: number;
  printHeightInches: number;
  effectiveDpi: number;
}

export interface CustomerUploadProcessingFailure {
  ok: false;
  code: CustomerUploadTechnicalFailureCode;
  message: string;
}

export type CustomerUploadProcessingResult =
  | CustomerUploadProcessingSuccess
  | CustomerUploadProcessingFailure;

export interface ProcessCustomerUploadImageOptions {
  onStage?: (stage: CustomerUploadTechnicalProgressStage) => void | Promise<void>;
  /**
   * Staff-provided Assisted proofs: skip transparency / “good image” rejection gates.
   * Still decodes, sizes, and builds production/preview/thumbnail derivatives.
   * Also accepts JPEG (converted to PNG) because Assisted proofs allow JPEG.
   */
  skipCustomerQualityGates?: boolean;
  /**
   * Legacy fast path: skip trim + upscale; reuse PNG/WebP source as production.
   * Do **not** use for Assisted → Design Library / upload intake — that path must use
   * `skipCustomerQualityGates` so approvedMaxInches matches normal finalize/upscale.
   * Implies skipCustomerQualityGates.
   */
  assistedProofFastIngest?: boolean;
}

function fail(
  code: CustomerUploadTechnicalFailureCode,
  message: string,
): CustomerUploadProcessingFailure {
  return { ok: false, code, message };
}

async function reportStage(
  onStage: ProcessCustomerUploadImageOptions["onStage"],
  stage: CustomerUploadTechnicalProgressStage,
): Promise<void> {
  if (!onStage) {
    return;
  }
  await onStage(stage);
}

function detectFormat(metadata: Metadata): CustomerUploadSourceFormat | null {
  if (metadata.format === "png") {
    return "png";
  }
  if (metadata.format === "webp") {
    return "webp";
  }
  return null;
}

function detectFormatAllowingJpeg(
  metadata: Metadata,
): CustomerUploadSourceFormat | "jpeg" | null {
  const base = detectFormat(metadata);
  if (base) {
    return base;
  }
  if (metadata.format === "jpeg" || metadata.format === "jpg") {
    return "jpeg";
  }
  return null;
}

function isAnimated(metadata: Metadata): boolean {
  const pages = metadata.pages ?? 1;
  return pages > 1;
}

async function countTransparentPixelsSampled(
  input: Buffer,
  sourceWidth: number,
  sourceHeight: number,
): Promise<{ hasAlpha: boolean; transparentPixelCount: number; sampleWidth: number; sampleHeight: number }> {
  const maxSide = Math.max(sourceWidth, sourceHeight);
  const sampleMax = 800;
  let pipeline = getSharp()(input, { failOn: "error" }).ensureAlpha();
  if (maxSide > sampleMax) {
    pipeline = pipeline.resize({
      width: sourceWidth >= sourceHeight ? sampleMax : undefined,
      height: sourceHeight > sourceWidth ? sampleMax : undefined,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
  if (info.channels < 4) {
    return {
      hasAlpha: false,
      transparentPixelCount: 0,
      sampleWidth: info.width,
      sampleHeight: info.height,
    };
  }

  const earlyExitCount = Math.ceil(
    info.width * info.height * CUSTOMER_UPLOAD_MIN_TRANSPARENT_PIXEL_RATIO,
  );
  let transparentPixelCount = 0;
  for (let i = 3; i < data.length; i += info.channels) {
    if (data[i] < CUSTOMER_UPLOAD_TRANSPARENT_ALPHA_MAX) {
      transparentPixelCount += 1;
      if (transparentPixelCount >= earlyExitCount) {
        return {
          hasAlpha: true,
          transparentPixelCount,
          sampleWidth: info.width,
          sampleHeight: info.height,
        };
      }
    }
  }

  return {
    hasAlpha: true,
    transparentPixelCount,
    sampleWidth: info.width,
    sampleHeight: info.height,
  };
}

/**
 * Cheap downscaled trim probe — detects empty transparent margins without a full-res re-encode.
 */
async function probeNeedsTransparentEdgeTrim(
  input: Buffer,
  sourceWidth: number,
  sourceHeight: number,
): Promise<boolean> {
  const maxSide = Math.max(sourceWidth, sourceHeight);
  const sampleMax = 512;
  try {
    let pipeline = getSharp()(input, { failOn: "error" }).ensureAlpha();
    if (maxSide > sampleMax) {
      pipeline = pipeline.resize({
        width: sourceWidth >= sourceHeight ? sampleMax : undefined,
        height: sourceHeight > sourceWidth ? sampleMax : undefined,
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    const sampleBytes = await pipeline.png().toBuffer();
    const before = await getSharp()(sampleBytes, { failOn: "error" }).metadata();
    const beforeW = before.width ?? 0;
    const beforeH = before.height ?? 0;
    if (beforeW <= 0 || beforeH <= 0) {
      return false;
    }

    const trimmedBytes = await getSharp()(sampleBytes, { failOn: "error" })
      .ensureAlpha()
      .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    const after = await getSharp()(trimmedBytes, { failOn: "error" }).metadata();
    const afterW = after.width ?? beforeW;
    const afterH = after.height ?? beforeH;
    const shrinkW = (beforeW - afterW) / beforeW;
    const shrinkH = (beforeH - afterH) / beforeH;
    return (
      shrinkW >= CUSTOMER_UPLOAD_MIN_TRIM_SHRINK_RATIO ||
      shrinkH >= CUSTOMER_UPLOAD_MIN_TRIM_SHRINK_RATIO
    );
  } catch {
    return false;
  }
}

async function trimTransparentEdges(input: Buffer): Promise<{
  bytes: Buffer;
  width: number;
  height: number;
  wasTrimmed: boolean;
  originalWidth: number;
  originalHeight: number;
}> {
  const originalMeta = await getSharp()(input, { failOn: "error" }).metadata();
  const originalWidth = originalMeta.width ?? 0;
  const originalHeight = originalMeta.height ?? 0;

  try {
    const trimmedBytes = await getSharp()(input, { failOn: "error" })
      .ensureAlpha()
      .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    const trimmedMeta = await getSharp()(trimmedBytes, { failOn: "error" }).metadata();
    const width = trimmedMeta.width ?? originalWidth;
    const height = trimmedMeta.height ?? originalHeight;
    const wasTrimmed = width !== originalWidth || height !== originalHeight;

    if (!wasTrimmed) {
      return {
        bytes: input,
        width: originalWidth,
        height: originalHeight,
        wasTrimmed: false,
        originalWidth,
        originalHeight,
      };
    }

    return {
      bytes: trimmedBytes,
      width,
      height,
      wasTrimmed: true,
      originalWidth,
      originalHeight,
    };
  } catch {
    // sharp throws when there is nothing to trim in some versions — treat as no-op.
    return {
      bytes: input,
      width: originalWidth,
      height: originalHeight,
      wasTrimmed: false,
      originalWidth,
      originalHeight,
    };
  }
}


async function upscaleIfNeeded(
  pngBytes: Buffer,
  width: number,
  height: number,
): Promise<{
  bytes: Buffer;
  width: number;
  height: number;
  wasUpscaled: boolean;
  upscaleFactor: number;
  upscalePassCount: 0 | 1;
  sizingWarningCode?: string;
}> {
  const decision = resolveImportUpscaleDecision(width, height);
  const target = resolveImportUpscaleTargetPx(width, height);
  if (!target || !decision.wasUpscaled) {
    return {
      bytes: pngBytes,
      width,
      height,
      wasUpscaled: false,
      upscaleFactor: 1,
      upscalePassCount: 0,
      ...(decision.sizingWarningCode ? { sizingWarningCode: decision.sizingWarningCode } : {}),
    };
  }

  const upscaled = await getSharp()(pngBytes, { failOn: "error" })
    .resize(target.widthPx, target.heightPx, { fit: "fill", withoutEnlargement: false })
    .png()
    .toBuffer();

  return {
    bytes: upscaled,
    width: target.widthPx,
    height: target.heightPx,
    wasUpscaled: true,
    upscaleFactor: decision.upscaleFactor,
    upscalePassCount: 1,
    ...(decision.sizingWarningCode ? { sizingWarningCode: decision.sizingWarningCode } : {}),
  };
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

/**
 * Authoritative image validation + normalization for customer uploads.
 */
export async function processCustomerUploadImageBytes(
  sourceBytes: Buffer,
  options: ProcessCustomerUploadImageOptions = {},
): Promise<CustomerUploadProcessingResult> {
  if (sourceBytes.byteLength <= 0 || sourceBytes.byteLength > CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES) {
    return fail(
      "image_exceeds_limits",
      `Image is ${formatFileSize(sourceBytes.byteLength)} and exceeds the ${formatFileSize(CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES)} size limit.`,
    );
  }

  const assistedFast = Boolean(options.assistedProofFastIngest);
  const skipQualityGates = Boolean(options.skipCustomerQualityGates) || assistedFast;

  await reportStage(options.onStage, "checking_format");

  let metadata: Metadata;
  try {
    metadata = await getSharp()(sourceBytes, { failOn: "error" }).metadata();
  } catch {
    return fail("could_not_decode", "Could not decode image.");
  }

  const detected = skipQualityGates
    ? detectFormatAllowingJpeg(metadata)
    : detectFormat(metadata);
  if (!detected) {
    return fail(
      "unsupported_format",
      skipQualityGates
        ? "Only JPEG, PNG, and static WebP images are supported."
        : "Only transparent PNG and static WebP images are supported.",
    );
  }

  if (isAnimated(metadata)) {
    return fail("animated_rejected", "Animated images are not supported.");
  }

  const sourceWidthPx = metadata.width ?? 0;
  const sourceHeightPx = metadata.height ?? 0;
  if (sourceWidthPx <= 0 || sourceHeightPx <= 0) {
    return fail("could_not_decode", "Could not decode image dimensions.");
  }

  if (
    sourceWidthPx > CUSTOMER_UPLOAD_MAX_DIMENSION_PX ||
    sourceHeightPx > CUSTOMER_UPLOAD_MAX_DIMENSION_PX ||
    sourceWidthPx * sourceHeightPx > CUSTOMER_UPLOAD_MAX_TOTAL_PIXELS
  ) {
    return fail("image_exceeds_limits", "Image dimensions exceed the allowed limits.");
  }

  // JPEG (staff proof path) is normalized to PNG; customer-upload sourceFormat stays png|webp.
  const sourceFormat: CustomerUploadSourceFormat = detected === "jpeg" ? "png" : detected;

  // Assisted ingest: skip transparency / trim / upscale. Copy-friendly production when PNG/WebP.
  if (assistedFast) {
    let productionPng: Buffer = sourceBytes;
    let productionWidth = sourceWidthPx;
    let productionHeight = sourceHeightPx;
    let productionReusedSource = detected === "png" || detected === "webp";

    if (detected === "jpeg") {
      await reportStage(options.onStage, "converting_format");
      try {
        productionPng = await getSharp()(sourceBytes, { failOn: "error" })
          .ensureAlpha()
          .png()
          .toBuffer();
      } catch {
        return fail("processing_failed", "Image processing failed.");
      }
      const normalizedMeta = await getSharp()(productionPng, { failOn: "error" }).metadata();
      productionWidth = normalizedMeta.width ?? sourceWidthPx;
      productionHeight = normalizedMeta.height ?? sourceHeightPx;
      productionReusedSource = false;
    }

    await reportStage(options.onStage, "checking_print_size");
    const assessmentResult = assessPrintSizeCapability(productionWidth, productionHeight);
    if (!assessmentResult.success) {
      return fail("image_exceeds_limits", assessmentResult.error);
    }
    const printFields = buildImportPrintSizeCreateFields({
      pixelWidth: productionWidth,
      pixelHeight: productionHeight,
      assessment:
        assessmentResult.assessment.acceptanceLevel === "reject"
          ? { ...assessmentResult.assessment, acceptanceLevel: "accept" }
          : assessmentResult.assessment,
    });
    if ("error" in printFields) {
      return fail("processing_failed", printFields.error);
    }

    const sizingMeta = buildImageQualitySizingMetadata(productionWidth, productionHeight, {
      wasUpscaled: false,
      upscalePassCount: 0,
      upscaleFactor: 1,
    });

    await reportStage(options.onStage, "creating_previews");
    let previewWebp: Buffer;
    let thumbnailWebp: Buffer;
    try {
      [previewWebp, thumbnailWebp] = await Promise.all([
        encodeDerivative(
          productionPng,
          PREVIEW_MAX_WIDTH_PX,
          PREVIEW_MAX_HEIGHT_PX,
          PREVIEW_WEBP_QUALITY,
        ),
        encodeDerivative(
          productionPng,
          THUMBNAIL_MAX_WIDTH_PX,
          THUMBNAIL_MAX_HEIGHT_PX,
          THUMBNAIL_WEBP_QUALITY,
        ),
      ]);
    } catch {
      return fail("processing_failed", "Could not generate image previews.");
    }

    return {
      ok: true,
      sourceFormat,
      sourceWidthPx,
      sourceHeightPx,
      widthPx: productionWidth,
      heightPx: productionHeight,
      wasUpscaled: false,
      wasTrimmed: false,
      upscaleFactor: sizingMeta.upscaleFactor,
      upscalePassCount: sizingMeta.upscalePassCount,
      approvedMaxPrintWidthInches: sizingMeta.approvedMaxPrintWidthInches,
      approvedMaxPrintHeightInches: sizingMeta.approvedMaxPrintHeightInches,
      sizingPolicyVersion: sizingMeta.sizingPolicyVersion,
      productionReusedSource,
      transparencyPassed: true,
      transparentPixelRatio: 0,
      productionPng,
      previewWebp,
      thumbnailWebp,
      printWidthInches: printFields.printWidthInches,
      printHeightInches: printFields.printHeightInches,
      effectiveDpi: printFields.effectiveDpi,
    };
  }

  await reportStage(options.onStage, "checking_transparency");

  const hasAlphaMeta = Boolean(metadata.hasAlpha);
  let trimmedProbe: Awaited<ReturnType<typeof trimTransparentEdges>> | null = null;
  let transparency = assessMeaningfulTransparency({
    hasAlphaChannel: hasAlphaMeta,
    widthPx: sourceWidthPx,
    heightPx: sourceHeightPx,
    transparentPixelCount: 0,
  });

  // Fast path: sample alpha on a downscaled copy (avoids full-resolution raw decode).
  if (hasAlphaMeta && !skipQualityGates) {
    try {
      const sample = await countTransparentPixelsSampled(
        sourceBytes,
        sourceWidthPx,
        sourceHeightPx,
      );
      transparency = assessMeaningfulTransparency({
        hasAlphaChannel: sample.hasAlpha || hasAlphaMeta,
        widthPx: sample.sampleWidth,
        heightPx: sample.sampleHeight,
        transparentPixelCount: sample.transparentPixelCount,
      });
    } catch {
      return fail("transparency_check_failed", "Could not validate image transparency.");
    }
  }

  // Only run the expensive full trim when sampling did not already prove transparency.
  if (!transparency.passed && !skipQualityGates) {
    await reportStage(options.onStage, "trimming");
    try {
      trimmedProbe = await trimTransparentEdges(sourceBytes);
    } catch {
      return fail("transparency_check_failed", "Could not validate image transparency.");
    }

    const trimShrinkRatioWidth =
      trimmedProbe.originalWidth > 0
        ? (trimmedProbe.originalWidth - trimmedProbe.width) / trimmedProbe.originalWidth
        : 0;
    const trimShrinkRatioHeight =
      trimmedProbe.originalHeight > 0
        ? (trimmedProbe.originalHeight - trimmedProbe.height) / trimmedProbe.originalHeight
        : 0;

    transparency = assessMeaningfulTransparency({
      hasAlphaChannel: hasAlphaMeta || trimmedProbe.wasTrimmed,
      widthPx: sourceWidthPx,
      heightPx: sourceHeightPx,
      transparentPixelCount: 0,
      trimShrinkRatioWidth,
      trimShrinkRatioHeight,
    });
  }

  if (!transparency.passed && !skipQualityGates) {
    return fail("background_not_transparent", "Background is not transparent.");
  }

  if (skipQualityGates && !transparency.passed) {
    // Staff art may be opaque; treat as passed for persistence without failing the ingest.
    transparency = {
      passed: true,
      transparentPixelRatio: transparency.transparentPixelRatio,
    };
  }

  let productionBase: Buffer;
  let productionWidth: number;
  let productionHeight: number;
  let wasTrimmed = false;
  let productionReusedSource = false;

  if (trimmedProbe?.wasTrimmed) {
    productionBase = trimmedProbe.bytes;
    productionWidth = trimmedProbe.width;
    productionHeight = trimmedProbe.height;
    wasTrimmed = true;
  } else if (sourceFormat === "png" && hasAlphaMeta) {
    // Transparent PNG: probe for empty margins; full trim only when needed; else keep source bytes.
    const needsTrim = await probeNeedsTransparentEdgeTrim(
      sourceBytes,
      sourceWidthPx,
      sourceHeightPx,
    );
    if (needsTrim) {
      await reportStage(options.onStage, "trimming");
      const trimmed = await trimTransparentEdges(sourceBytes);
      productionBase = trimmed.bytes;
      productionWidth = trimmed.width;
      productionHeight = trimmed.height;
      wasTrimmed = trimmed.wasTrimmed;
      productionReusedSource = !trimmed.wasTrimmed;
    } else {
      productionBase = sourceBytes;
      productionWidth = sourceWidthPx;
      productionHeight = sourceHeightPx;
      wasTrimmed = false;
      productionReusedSource = true;
    }
  } else {
    await reportStage(options.onStage, "converting_format");
    try {
      productionBase = await getSharp()(sourceBytes, { failOn: "error" }).ensureAlpha().png().toBuffer();
    } catch {
      return fail("processing_failed", "Image processing failed.");
    }
    const normalizedMeta = await getSharp()(productionBase, { failOn: "error" }).metadata();
    productionWidth = normalizedMeta.width ?? sourceWidthPx;
    productionHeight = normalizedMeta.height ?? sourceHeightPx;
    wasTrimmed = false;

    await reportStage(options.onStage, "trimming");
    const trimmed = await trimTransparentEdges(productionBase);
    productionBase = trimmed.bytes;
    productionWidth = trimmed.width;
    productionHeight = trimmed.height;
    wasTrimmed = trimmed.wasTrimmed;
  }

  const upscaleTarget = resolveImportUpscaleTargetPx(productionWidth, productionHeight);
  let upscaled: Awaited<ReturnType<typeof upscaleIfNeeded>>;
  if (upscaleTarget) {
    await reportStage(options.onStage, "upscaling");
    upscaled = await upscaleIfNeeded(productionBase, productionWidth, productionHeight);
    productionReusedSource = false;
  } else {
    const decision = resolveImportUpscaleDecision(productionWidth, productionHeight);
    upscaled = {
      bytes: productionBase,
      width: productionWidth,
      height: productionHeight,
      wasUpscaled: false,
      upscaleFactor: 1,
      upscalePassCount: 0,
      ...(decision.sizingWarningCode ? { sizingWarningCode: decision.sizingWarningCode } : {}),
    };
  }

  await reportStage(options.onStage, "checking_print_size");

  const assessmentResult = assessPrintSizeCapability(upscaled.width, upscaled.height);
  if (!assessmentResult.success) {
    return fail("image_exceeds_limits", assessmentResult.error);
  }
  if (assessmentResult.assessment.acceptanceLevel === "reject" && !skipQualityGates) {
    return fail(
      "image_exceeds_limits",
      "Image does not meet the minimum print quality requirements.",
    );
  }

  let printFields = buildImportPrintSizeCreateFields({
    pixelWidth: upscaled.width,
    pixelHeight: upscaled.height,
    assessment:
      assessmentResult.assessment.acceptanceLevel === "reject" && skipQualityGates
        ? { ...assessmentResult.assessment, acceptanceLevel: "accept" }
        : assessmentResult.assessment,
  });
  if ("error" in printFields) {
    return fail("processing_failed", printFields.error);
  }

  const sizingMeta = buildImageQualitySizingMetadata(upscaled.width, upscaled.height, {
    wasUpscaled: upscaled.wasUpscaled,
    upscalePassCount: upscaled.upscalePassCount,
    upscaleFactor: upscaled.upscaleFactor,
    sizingWarningCode: upscaled.sizingWarningCode as
      | "TARGET_NOT_REACHED_UPSCALE_CAPPED"
      | "NEAR_TARGET_SKIPPED"
      | undefined,
  });

  await reportStage(options.onStage, "creating_previews");

  let previewWebp: Buffer;
  let thumbnailWebp: Buffer;
  try {
    [previewWebp, thumbnailWebp] = await Promise.all([
      encodeDerivative(
        upscaled.bytes,
        PREVIEW_MAX_WIDTH_PX,
        PREVIEW_MAX_HEIGHT_PX,
        PREVIEW_WEBP_QUALITY,
      ),
      encodeDerivative(
        upscaled.bytes,
        THUMBNAIL_MAX_WIDTH_PX,
        THUMBNAIL_MAX_HEIGHT_PX,
        THUMBNAIL_WEBP_QUALITY,
      ),
    ]);
  } catch {
    return fail("processing_failed", "Could not generate image previews.");
  }

  return {
    ok: true,
    sourceFormat,
    sourceWidthPx,
    sourceHeightPx,
    widthPx: upscaled.width,
    heightPx: upscaled.height,
    wasUpscaled: upscaled.wasUpscaled,
    wasTrimmed,
    upscaleFactor: sizingMeta.upscaleFactor,
    upscalePassCount: sizingMeta.upscalePassCount,
    approvedMaxPrintWidthInches: sizingMeta.approvedMaxPrintWidthInches,
    approvedMaxPrintHeightInches: sizingMeta.approvedMaxPrintHeightInches,
    sizingPolicyVersion: sizingMeta.sizingPolicyVersion,
    ...(sizingMeta.sizingWarningCode
      ? { sizingWarningCode: sizingMeta.sizingWarningCode }
      : {}),
    productionReusedSource: productionReusedSource && !upscaled.wasUpscaled && !wasTrimmed,
    transparencyPassed: true,
    transparentPixelRatio: transparency.transparentPixelRatio,
    productionPng: upscaled.bytes,
    previewWebp,
    thumbnailWebp,
    printWidthInches: printFields.printWidthInches,
    printHeightInches: printFields.printHeightInches,
    effectiveDpi: printFields.effectiveDpi,
  };
}


/**
 * Persist production + preview + thumbnail. When production matches the uploaded source,
 * copy in GCS instead of re-uploading identical PNG bytes.
 */
export async function saveCustomerUploadProcessedOutputs(params: {
  // Firebase Admin Storage Bucket — kept loose to avoid coupling this lib to @google-cloud/storage types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bucket: { file: (objectPath: string) => any };
  sourceObjectPath: string;
  productionObjectPath: string;
  previewObjectPath: string;
  thumbnailObjectPath: string;
  processed: CustomerUploadProcessingSuccess;
}): Promise<void> {
  const productionFile = params.bucket.file(params.productionObjectPath);
  const productionTask = params.processed.productionReusedSource
    ? params.bucket
        .file(params.sourceObjectPath)
        .copy(productionFile)
        .then(() =>
          productionFile.setMetadata({
            contentType: "image/png",
            cacheControl: "private, max-age=3600",
          }),
        )
    : productionFile.save(params.processed.productionPng, {
        resumable: false,
        contentType: "image/png",
        metadata: { cacheControl: "private, max-age=3600" },
      });

  await Promise.all([
    productionTask,
    params.bucket.file(params.previewObjectPath).save(params.processed.previewWebp, {
      resumable: false,
      contentType: "image/webp",
      metadata: { cacheControl: "private, max-age=3600" },
    }),
    params.bucket.file(params.thumbnailObjectPath).save(params.processed.thumbnailWebp, {
      resumable: false,
      contentType: "image/webp",
      metadata: { cacheControl: "private, max-age=3600" },
    }),
  ]);
}
