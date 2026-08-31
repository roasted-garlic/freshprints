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
import { CUSTOMER_UPLOAD_MIN_TRIM_SHRINK_RATIO } from "../../../packages/shared/src/utils/customerUploadTransparency";
import {
  MEANINGFUL_TRANSPARENCY_DECODE_MAX_INPUT_PIXELS,
  measureMeaningfulTransparency,
} from "../../../packages/shared/src/utils/meaningfulTransparencyMeasurement";

import { storageObjectPath } from "./storageObjectPath";
import { getSharp } from "./lazySharp";

export { storageObjectPath };

/**
 * Decoder-time pixel bound passed to every `getSharp()(...)` call in this module. Deliberately
 * set to **sharp's own built-in decoder default** (`0x3FFF * 0x3FFF` = 268,435,456 px, ~1.0 GiB
 * max RGBA buffer — well within the 2 GiB function memory budget), not to
 * {@link CUSTOMER_UPLOAD_MAX_TOTAL_PIXELS}. Binding this to the app-level 100,000,000-pixel
 * ceiling would reject the *decode itself* for any oversized-but-trimmable canvas before trim
 * ever runs — exactly the bug this Plan (ADR-FP-125) exists to fix. This bound exists only to
 * cap the pathological/adversarial case (a maliciously or accidentally enormous source) at a
 * memory-safe ceiling; the actual product-level ceiling
 * (`CUSTOMER_UPLOAD_MAX_DIMENSION_PX`/`CUSTOMER_UPLOAD_MAX_TOTAL_PIXELS`) is enforced afterward,
 * against post-trim dimensions, by `processCustomerUploadImageBytes` itself.
 *
 * Shared with Studio import via `MEANINGFUL_TRANSPARENCY_DECODE_MAX_INPUT_PIXELS`.
 */
export const CUSTOMER_UPLOAD_DECODE_MAX_INPUT_PIXELS = MEANINGFUL_TRANSPARENCY_DECODE_MAX_INPUT_PIXELS;

export interface AssistedFinalSourceImageProbeResult {
  widthPx: number;
  heightPx: number;
  format: string;
}

export async function probeAssistedFinalSourceImageBytes(
  sourceBytes: Buffer,
): Promise<AssistedFinalSourceImageProbeResult> {
  let metadata: Metadata;
  try {
    metadata = await getSharp()(sourceBytes, {
      failOn: "error",
      limitInputPixels: CUSTOMER_UPLOAD_DECODE_MAX_INPUT_PIXELS,
    }).metadata();
  } catch {
    throw new Error("Could not decode final artwork image.");
  }

  const widthPx = metadata.width ?? 0;
  const heightPx = metadata.height ?? 0;
  if (widthPx <= 0 || heightPx <= 0 || !Number.isFinite(widthPx) || !Number.isFinite(heightPx)) {
    throw new Error("Final artwork image dimensions are invalid.");
  }

  const format = typeof metadata.format === "string" ? metadata.format : "";
  if (!format) {
    throw new Error("Final artwork image format is not supported.");
  }

  return { widthPx, heightPx, format };
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
  /**
   * True only when the downscale-only dimension-ceiling normalization pass ran (ADR-FP-125).
   * Independent of, and not mutually exclusive with, `wasUpscaled` — both are separate booleans
   * for separate, opposite-direction operations; a future scenario could in principle have both
   * true, even though today's policy makes that combination unreachable in practice (normalization
   * only fires on still-oversized images, which are never also upscale candidates).
   */
  wasNormalizedForDimensions: boolean;
  /** Source dimensions before this pass's normalization; equal to widthPx/heightPx when normalization did not run. */
  preNormalizationWidthPx: number;
  preNormalizationHeightPx: number;
  upscaleFactor: number;
  upscalePassCount: 0 | 1 | 2;
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
  /**
   * Sanitized per-stage duration (ms), keyed by progress-stage name. Contains only stage names
   * and numbers — no artwork content, filenames, or customer identifiers. Callers (finalize/retry
   * callables) are responsible for attaching this to a structured log entry; this library
   * function never logs directly, keeping it a pure, directly-testable unit.
   */
  stageTimingsMs: Partial<Record<CustomerUploadTechnicalProgressStage, number>>;
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

/**
 * Tracks sanitized per-stage wall-clock duration alongside the existing `onStage` progress
 * callback. `enter(stage)` closes out the previous stage's elapsed time (if any) before invoking
 * `onStage` for the new one; call `finish()` once at the end to close out the final open stage.
 */
class StageTimer {
  private readonly timingsMs: Partial<Record<CustomerUploadTechnicalProgressStage, number>> = {};
  private currentStage: CustomerUploadTechnicalProgressStage | null = null;
  private currentStageStartedAt = 0;

  constructor(private readonly onStage: ProcessCustomerUploadImageOptions["onStage"]) {}

  async enter(stage: CustomerUploadTechnicalProgressStage): Promise<void> {
    this.closeCurrentStage();
    this.currentStage = stage;
    this.currentStageStartedAt = Date.now();
    if (this.onStage) {
      await this.onStage(stage);
    }
  }

  finish(): Partial<Record<CustomerUploadTechnicalProgressStage, number>> {
    this.closeCurrentStage();
    return this.timingsMs;
  }

  private closeCurrentStage(): void {
    if (!this.currentStage) {
      return;
    }
    const elapsed = Date.now() - this.currentStageStartedAt;
    this.timingsMs[this.currentStage] = (this.timingsMs[this.currentStage] ?? 0) + elapsed;
  }
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
    let pipeline = getSharp()(input, {
      failOn: "error",
      limitInputPixels: CUSTOMER_UPLOAD_DECODE_MAX_INPUT_PIXELS,
    }).ensureAlpha();
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

/**
 * Trims transparent margins at full resolution. Callers must already know `originalWidth`/
 * `originalHeight` (from an earlier bounded metadata read) and pass them in — this function
 * never re-derives them via a separate `.metadata()` decode. The trim's own
 * `.toBuffer({ resolveWithObject: true })` call returns `info.width`/`info.height` from the same
 * operation that produced the trimmed bytes, eliminating what was previously a third full-
 * resolution decode. Net: one full-resolution decode total (the trim itself), not three.
 */
async function trimTransparentEdges(
  input: Buffer,
  originalWidth: number,
  originalHeight: number,
): Promise<{
  bytes: Buffer;
  width: number;
  height: number;
  wasTrimmed: boolean;
  originalWidth: number;
  originalHeight: number;
}> {
  try {
    const { data: _data, info } = await getSharp()(input, {
      failOn: "error",
      limitInputPixels: CUSTOMER_UPLOAD_DECODE_MAX_INPUT_PIXELS,
    })
      .ensureAlpha()
      .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer({ resolveWithObject: true });

    const width = info.width ?? originalWidth;
    const height = info.height ?? originalHeight;
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
      bytes: Buffer.from(_data),
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


/**
 * Downscale-only normalization for a still-oversized (post-trim) image. Strictly separate from
 * {@link upscaleIfNeeded} (ADR-FP-080's controlled-upscale pass, opposite direction) — this
 * function only ever shrinks, never enlarges. Triggered only when trimmed dimensions still exceed
 * {@link CUSTOMER_UPLOAD_MAX_DIMENSION_PX} per side or {@link CUSTOMER_UPLOAD_MAX_TOTAL_PIXELS} in
 * total (see ADR-FP-125's narrow amendment to ADR-FP-080 item 2). Resizes proportionally
 * (`fit: "inside"`, no crop/stretch/distort) by the *strictest* of the three possible constraints
 * — whichever of width-ceiling, height-ceiling, or sqrt(total-pixel-ceiling) implies the smallest
 * scale factor wins, so the result satisfies all three ceilings simultaneously, not just one.
 * The caller (`wasNormalizedForDimensions`) and `wasUpscaled` are independent, non-mutually-
 * exclusive booleans — this pass never sets `wasUpscaled`, and `upscaleIfNeeded` never sets
 * `wasNormalizedForDimensions`; nothing in the type system couples them, so downstream code must
 * not assume only one can ever be true.
 */
async function normalizeForDimensionCeiling(
  pngBytes: Buffer,
  width: number,
  height: number,
): Promise<{
  bytes: Buffer;
  width: number;
  height: number;
  wasNormalizedForDimensions: boolean;
  preNormalizationWidthPx: number;
  preNormalizationHeightPx: number;
}> {
  const exceedsDimension =
    width > CUSTOMER_UPLOAD_MAX_DIMENSION_PX || height > CUSTOMER_UPLOAD_MAX_DIMENSION_PX;
  const exceedsTotalPixels = width * height > CUSTOMER_UPLOAD_MAX_TOTAL_PIXELS;

  if (!exceedsDimension && !exceedsTotalPixels) {
    return {
      bytes: pngBytes,
      width,
      height,
      wasNormalizedForDimensions: false,
      preNormalizationWidthPx: width,
      preNormalizationHeightPx: height,
    };
  }

  // Strictest-wins: compute the scale factor implied by each ceiling independently, then use the
  // smallest (most restrictive) one so every ceiling is satisfied at once.
  const widthScale = CUSTOMER_UPLOAD_MAX_DIMENSION_PX / width;
  const heightScale = CUSTOMER_UPLOAD_MAX_DIMENSION_PX / height;
  const totalPixelScale = Math.sqrt(CUSTOMER_UPLOAD_MAX_TOTAL_PIXELS / (width * height));
  const scale = Math.min(1, widthScale, heightScale, totalPixelScale);

  const targetWidth = Math.max(1, Math.floor(width * scale));
  const targetHeight = Math.max(1, Math.floor(height * scale));

  const { data: _data, info } = await getSharp()(pngBytes, {
    failOn: "error",
    limitInputPixels: CUSTOMER_UPLOAD_DECODE_MAX_INPUT_PIXELS,
  })
    .resize(targetWidth, targetHeight, { fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer({ resolveWithObject: true });

  return {
    bytes: Buffer.from(_data),
    width: info.width ?? targetWidth,
    height: info.height ?? targetHeight,
    wasNormalizedForDimensions: true,
    preNormalizationWidthPx: width,
    preNormalizationHeightPx: height,
  };
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
  upscalePassCount: 0 | 1 | 2;
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
  const stageTimer = new StageTimer(options.onStage);

  await stageTimer.enter("checking_format");

  let metadata: Metadata;
  try {
    metadata = await getSharp()(sourceBytes, {
      failOn: "error",
      limitInputPixels: CUSTOMER_UPLOAD_DECODE_MAX_INPUT_PIXELS,
    }).metadata();
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

  // JPEG (staff proof path) is normalized to PNG; customer-upload sourceFormat stays png|webp.
  const sourceFormat: CustomerUploadSourceFormat = detected === "jpeg" ? "png" : detected;

  // Assisted ingest: skip transparency / trim / upscale. Copy-friendly production when PNG/WebP.
  // No trim-based rescue is attempted on this path, so the dimension/pixel ceiling is still
  // evaluated against the raw source here (unlike the main path below, which defers this check
  // until after a trim attempt has had a chance to bring an oversized-canvas image back in range).
  if (assistedFast) {
    if (
      sourceWidthPx > CUSTOMER_UPLOAD_MAX_DIMENSION_PX ||
      sourceHeightPx > CUSTOMER_UPLOAD_MAX_DIMENSION_PX ||
      sourceWidthPx * sourceHeightPx > CUSTOMER_UPLOAD_MAX_TOTAL_PIXELS
    ) {
      return fail("image_exceeds_limits", "Image dimensions exceed the allowed limits.");
    }
    let productionPng: Buffer = sourceBytes;
    let productionWidth = sourceWidthPx;
    let productionHeight = sourceHeightPx;
    let productionReusedSource = detected === "png" || detected === "webp";

    if (detected === "jpeg") {
      await stageTimer.enter("converting_format");
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

    await stageTimer.enter("checking_print_size");
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

    await stageTimer.enter("creating_previews");
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
      wasNormalizedForDimensions: false,
      preNormalizationWidthPx: productionWidth,
      preNormalizationHeightPx: productionHeight,
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
      stageTimingsMs: stageTimer.finish(),
    };
  }

  await stageTimer.enter("checking_transparency");

  const hasAlphaMeta = Boolean(metadata.hasAlpha);
  const transparency = await measureMeaningfulTransparency(getSharp(), sourceBytes, {
    decodeMaxInputPixels: CUSTOMER_UPLOAD_DECODE_MAX_INPUT_PIXELS,
    skipQualityGates,
  });

  if (!transparency.passed && !skipQualityGates) {
    if (transparency.failureCode === "transparency_check_failed") {
      return fail("transparency_check_failed", "Could not validate image transparency.");
    }
    return fail("background_not_transparent", "Background is not transparent.");
  }

  let productionBase: Buffer;
  let productionWidth: number;
  let productionHeight: number;
  let wasTrimmed = false;
  let productionReusedSource = false;

  if (sourceFormat === "png" && hasAlphaMeta) {
    // Transparent PNG: probe for empty margins; full trim only when needed; else keep source bytes.
    const needsTrim = await probeNeedsTransparentEdgeTrim(
      sourceBytes,
      sourceWidthPx,
      sourceHeightPx,
    );
    if (needsTrim) {
      await stageTimer.enter("trimming");
      const trimmed = await trimTransparentEdges(sourceBytes, sourceWidthPx, sourceHeightPx);
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
    await stageTimer.enter("converting_format");
    let convertedWidth: number;
    let convertedHeight: number;
    try {
      const { data: _convertedData, info: convertedInfo } = await getSharp()(sourceBytes, {
        failOn: "error",
        limitInputPixels: CUSTOMER_UPLOAD_DECODE_MAX_INPUT_PIXELS,
      })
        .ensureAlpha()
        .png()
        .toBuffer({ resolveWithObject: true });
      productionBase = Buffer.from(_convertedData);
      convertedWidth = convertedInfo.width ?? sourceWidthPx;
      convertedHeight = convertedInfo.height ?? sourceHeightPx;
    } catch {
      return fail("processing_failed", "Image processing failed.");
    }
    productionWidth = convertedWidth;
    productionHeight = convertedHeight;
    wasTrimmed = false;

    await stageTimer.enter("trimming");
    const trimmed = await trimTransparentEdges(productionBase, convertedWidth, convertedHeight);
    productionBase = trimmed.bytes;
    productionWidth = trimmed.width;
    productionHeight = trimmed.height;
    wasTrimmed = trimmed.wasTrimmed;
  }

  // Downscale-only normalization (ADR-FP-125): only reached when the trimmed image still exceeds
  // the technical ceiling. Runs before the upscale check below so upscale never operates on an
  // already-oversized image; the two passes are mutually unreachable in today's policy (a
  // just-normalized image is, by construction, at or under the ceiling and therefore not itself an
  // upscale candidate), but the fields they set (`wasNormalizedForDimensions`/`wasUpscaled`) remain
  // independent booleans, not structurally coupled.
  let normalization: Awaited<ReturnType<typeof normalizeForDimensionCeiling>>;
  if (
    productionWidth > CUSTOMER_UPLOAD_MAX_DIMENSION_PX ||
    productionHeight > CUSTOMER_UPLOAD_MAX_DIMENSION_PX ||
    productionWidth * productionHeight > CUSTOMER_UPLOAD_MAX_TOTAL_PIXELS
  ) {
    await stageTimer.enter("checking_print_size");
    try {
      normalization = await normalizeForDimensionCeiling(
        productionBase,
        productionWidth,
        productionHeight,
      );
    } catch {
      return fail("image_exceeds_limits", "Image dimensions exceed the allowed limits.");
    }
    productionBase = normalization.bytes;
    productionWidth = normalization.width;
    productionHeight = normalization.height;
    productionReusedSource = false;

    // Still over the ceiling after normalizing to the technical maximum — a genuine reject case,
    // not a silent quality loss (the Plan's "reject only when normalization cannot safely succeed").
    if (
      productionWidth > CUSTOMER_UPLOAD_MAX_DIMENSION_PX ||
      productionHeight > CUSTOMER_UPLOAD_MAX_DIMENSION_PX ||
      productionWidth * productionHeight > CUSTOMER_UPLOAD_MAX_TOTAL_PIXELS
    ) {
      return fail("image_exceeds_limits", "Image dimensions exceed the allowed limits.");
    }
  } else {
    normalization = {
      bytes: productionBase,
      width: productionWidth,
      height: productionHeight,
      wasNormalizedForDimensions: false,
      preNormalizationWidthPx: productionWidth,
      preNormalizationHeightPx: productionHeight,
    };
  }

  const upscaleTarget = resolveImportUpscaleTargetPx(productionWidth, productionHeight);
  let upscaled: Awaited<ReturnType<typeof upscaleIfNeeded>>;
  if (upscaleTarget) {
    await stageTimer.enter("upscaling");
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

  await stageTimer.enter("checking_print_size");

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

  const printFields = buildImportPrintSizeCreateFields({
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

  await stageTimer.enter("creating_previews");

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
    wasNormalizedForDimensions: normalization.wasNormalizedForDimensions,
    preNormalizationWidthPx: normalization.preNormalizationWidthPx,
    preNormalizationHeightPx: normalization.preNormalizationHeightPx,
    upscaleFactor: sizingMeta.upscaleFactor,
    upscalePassCount: sizingMeta.upscalePassCount,
    approvedMaxPrintWidthInches: sizingMeta.approvedMaxPrintWidthInches,
    approvedMaxPrintHeightInches: sizingMeta.approvedMaxPrintHeightInches,
    sizingPolicyVersion: sizingMeta.sizingPolicyVersion,
    ...(sizingMeta.sizingWarningCode
      ? { sizingWarningCode: sizingMeta.sizingWarningCode }
      : {}),
    productionReusedSource:
      productionReusedSource &&
      !upscaled.wasUpscaled &&
      !wasTrimmed &&
      !normalization.wasNormalizedForDimensions,
    transparencyPassed: true,
    transparentPixelRatio: transparency.transparentPixelRatio,
    productionPng: upscaled.bytes,
    previewWebp,
    thumbnailWebp,
    printWidthInches: printFields.printWidthInches,
    printHeightInches: printFields.printHeightInches,
    effectiveDpi: printFields.effectiveDpi,
    stageTimingsMs: stageTimer.finish(),
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
