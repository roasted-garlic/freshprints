/**
 * Pipeline status values used during Phase 3C derivative processing.
 * Subset of DesignStatus — does not include queue, archive, or AI rejection states.
 */
export const derivativeProcessingStatuses = ["imported", "processing", "ready"] as const;

export type DerivativeProcessingStatus = (typeof derivativeProcessingStatuses)[number];

export function isDerivativeProcessingStatus(value: unknown): value is DerivativeProcessingStatus {
  return (
    typeof value === "string" &&
    derivativeProcessingStatuses.includes(value as DerivativeProcessingStatus)
  );
}

/** Tracks in-flight derivative work for a single design (orchestration layer — Step 5+) */
export interface DerivativeProcessingState {
  designId: string;
  status: DerivativeProcessingStatus;
}

/** Outcome tiers per Phase 3C kickoff */
export type DerivativePipelineOutcomeTier = "import_success" | "pipeline_success";

export interface DerivativePipelineOutcome {
  designId: string;
  importSuccess: boolean;
  pipelineSuccess: boolean;
  tier: DerivativePipelineOutcomeTier;
}

export interface DerivativeImageDimensions {
  width: number;
  height: number;
}

export interface ThumbnailDerivativeMetadata extends DerivativeImageDimensions {
  format: "webp";
  quality: number;
  byteLength: number;
}

export interface PreviewDerivativeMetadata extends DerivativeImageDimensions {
  format: "webp";
  quality: number;
  byteLength: number;
}

/** Input for main-process derivative generation (Step 3 — extended read handler) */
export interface DerivativeGenerationRequest {
  pngBytes: Uint8Array;
  fileName: string;
  fileSizeBytes: number;
}

/** Successful derivative generation result returned from main process */
export interface DerivativeGenerationResult {
  thumbnailBytes: Uint8Array;
  previewBytes: Uint8Array;
  thumbnail: ThumbnailDerivativeMetadata;
  preview: PreviewDerivativeMetadata;
}

export type DerivativeGenerationFailureCode =
  | "FILE_TOO_LARGE"
  | "INVALID_INPUT"
  | "INVALID_PNG"
  | "SHARP_LOAD_FAILED"
  | "DECODE_FAILED"
  | "ENCODE_FAILED"
  | "DERIVATIVE_TOO_LARGE"
  | "PROCESSING_FAILED"
  | "NOT_IMPLEMENTED";

export interface DerivativeGenerationFailure {
  code: DerivativeGenerationFailureCode;
  message: string;
}

export type DerivativeGenerationOutcome =
  | { success: true; data: DerivativeGenerationResult }
  | { success: false; error: DerivativeGenerationFailure };

/** Dev-only main-process verification result (Phase 3C Step 3) */
export interface DerivativeGenerationVerificationResult {
  sharpLoadOk: boolean;
  sharpVersion: string | null;
  validPngTestPassed: boolean;
  transparentPngTestPassed: boolean;
  noUpscaleTestPassed: boolean;
  invalidPngTestPassed: boolean;
  details: string[];
}
