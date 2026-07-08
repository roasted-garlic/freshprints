import type { DerivativeGenerationFailure } from "./derivativeGeneration.types";

export type ImportDerivativeStatus = "ready" | "failed" | "skipped";

export type ImportFinalDesignStatus = "imported" | "processing" | "ready";

export interface ImportPipelineOutcomeFields {
  derivativeStatus: ImportDerivativeStatus;
  finalStatus: ImportFinalDesignStatus;
  importSuccess: boolean;
  pipelineSuccess: boolean;
  thumbnailPath?: string;
  previewPath?: string;
  derivativeError?: string;
  cleanupWarning?: string | null;
}

export interface ImportDerivativePipelineSuccess {
  success: true;
  originalPath: string;
  thumbnailPath: string;
  previewPath: string;
}

export interface ImportDerivativePipelineFailure {
  success: false;
  message: string;
  cleanupWarning?: string | null;
}

export type ImportDerivativePipelineResult =
  | ImportDerivativePipelineSuccess
  | ImportDerivativePipelineFailure;

export function formatDerivativeGenerationError(
  error: DerivativeGenerationFailure,
): string {
  return error.message;
}
