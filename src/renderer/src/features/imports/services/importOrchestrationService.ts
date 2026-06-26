import type {
  ImportOriginalUploadResult,
  ImportPngWarning,
  ValidateSelectedPngFileResult,
} from "../../../../../../shared/types/import/importIpc.types";
import {
  formatDerivativeGenerationError,
  type ImportDerivativeStatus,
  type ImportFinalDesignStatus,
} from "../../../../../../shared/types/import/importOrchestration.types";
import { buildImportPrintSizeCreateFields } from "../../../../../../shared/utils/importPrintSizeMetadata";
import { formatPrintSizeRejectedMessage } from "../../../../../../shared/utils/importPrintSizeMessages";
import type { User } from "../../users/types/user.types";
import { designService } from "../../designs/services/designService";
import { importDesignTitleFromFileName } from "../utils/importDesignTitleFromFileName";
import { resolveImportDpi } from "../utils/resolveImportDpi";
import { importDerivativeService } from "./importDerivativeService";
import { importDesktopService } from "./importDesktopService";
import { ImportOrchestrationError } from "./importOrchestrationError";
import { importUploadService } from "./importUploadService";
import { logPipelineEvent } from "../../../shared/utils/pipelineLog";

export interface SinglePngUploadOutcome {
  uploadResult: ImportOriginalUploadResult;
  validationResult: ValidateSelectedPngFileResult;
  warnings: ImportPngWarning[];
  pipelineSuccess: boolean;
}

export interface ImportValidatedPngFileOptions {
  jobId?: string;
}

export interface ImportValidatedPngFileSuccess {
  status: "success";
  uploadResult: ImportOriginalUploadResult;
  warnings: ImportPngWarning[];
  importSuccess: true;
  pipelineSuccess: boolean;
}

export interface ImportValidatedPngFileFailure {
  cleanupWarning?: string | null;
  message: string;
  status: "failed";
}

export type ImportValidatedPngFileResult =
  | ImportValidatedPngFileFailure
  | ImportValidatedPngFileSuccess;

const ORPHAN_CLEANUP_WARNING =
  "The uploaded file could not be removed from Firebase Storage. Contact an administrator to avoid leaving an orphan file.";

async function rollbackUploadedOriginal(designId: string): Promise<string | null> {
  try {
    await importUploadService.deleteOriginalPng(designId);
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown cleanup error.";
    console.error(
      `Failed to delete orphan original after Firestore create failure (${designId}):`,
      message,
    );
    return ORPHAN_CLEANUP_WARNING;
  }
}

function buildUploadResult(input: {
  designId: string;
  designTitle: string;
  fileName: string;
  fileSizeBytes: number;
  originalPath: string;
  finalStatus: ImportFinalDesignStatus;
  derivativeStatus: ImportDerivativeStatus;
  pipelineSuccess: boolean;
  thumbnailPath?: string;
  previewPath?: string;
  derivativeError?: string;
  cleanupWarning?: string | null;
  aiEnqueueError?: string | null;
}): ImportOriginalUploadResult {
  return {
    catalogRecordCreated: true,
    designId: input.designId,
    designTitle: input.designTitle,
    fileName: input.fileName,
    fileSizeBytes: input.fileSizeBytes,
    originalPath: input.originalPath,
    status: "complete",
    finalStatus: input.finalStatus,
    derivativeStatus: input.derivativeStatus,
    importSuccess: true,
    pipelineSuccess: input.pipelineSuccess,
    thumbnailPath: input.thumbnailPath,
    previewPath: input.previewPath,
    derivativeError: input.derivativeError,
    cleanupWarning: input.cleanupWarning ?? null,
    aiEnqueueError: input.aiEnqueueError ?? null,
  };
}

export async function importValidatedPngFile(
  caller: User,
  validationResult: ValidateSelectedPngFileResult,
  options?: ImportValidatedPngFileOptions,
): Promise<ImportValidatedPngFileResult> {
  if (validationResult.printSizeAssessment.acceptanceLevel === "reject") {
    return {
      status: "failed",
      message: formatPrintSizeRejectedMessage(),
    };
  }

  const printSizeFields = buildImportPrintSizeCreateFields({
    pixelWidth: validationResult.width,
    pixelHeight: validationResult.height,
    assessment: validationResult.printSizeAssessment,
    metadataDpiX: validationResult.dpiX,
    metadataDpiY: validationResult.dpiY,
  });

  if ("error" in printSizeFields) {
    return {
      status: "failed",
      message: printSizeFields.error,
    };
  }

  const designId = designService.generateDesignId();

  const readResult = options?.jobId
    ? await importDesktopService.readBatchValidatedPngFileBytesWithDerivatives(
        options.jobId,
        validationResult.filePath,
      )
    : await importDesktopService.readSelectedPngFileBytesWithDerivatives(validationResult.filePath);

  if (!readResult.success) {
    return {
      status: "failed",
      message: readResult.error.message,
    };
  }

  let uploadResult;

  try {
    uploadResult = await importUploadService.uploadOriginalPng(designId, readResult.data.bytes);
  } catch (error) {
    return {
      status: "failed",
      message:
        error instanceof Error
          ? error.message
          : "Unable to upload the PNG file to Firebase Storage.",
    };
  }

  let design;

  try {
    design = await designService.createDesign(caller, {
      id: designId,
      title: importDesignTitleFromFileName(validationResult.fileName),
      description: "",
      status: "imported",
      originalPath: uploadResult.originalPath,
      thumbnailPath: "",
      previewPath: "",
      tags: [],
      width: validationResult.width,
      height: validationResult.height,
      dpi: resolveImportDpi(validationResult),
      ...printSizeFields,
      aiReviewStatus: "pending",
      aiReviewed: false,
      aiProcessed: false,
    });
  } catch (error) {
    const cleanupWarning = await rollbackUploadedOriginal(designId);
    const createMessage =
      error instanceof Error
        ? error.message
        : "Unable to create the Firestore design catalog record.";

    return {
      status: "failed",
      message: createMessage,
      cleanupWarning,
    };
  }

  const baseUploadFields = {
    designId: design.id,
    designTitle: design.title,
    fileName: validationResult.fileName,
    fileSizeBytes: validationResult.fileSizeBytes,
    originalPath: design.originalPath,
  };

  const derivatives = readResult.data.derivatives;
  const derivativeGenerationError = readResult.data.derivativeError;

  if (!derivatives) {
    const derivativeError = derivativeGenerationError
      ? formatDerivativeGenerationError(derivativeGenerationError)
      : "Derivative generation did not return thumbnail and preview bytes.";

    return {
      status: "success",
      importSuccess: true,
      pipelineSuccess: false,
      warnings: validationResult.warnings,
      uploadResult: buildUploadResult({
        ...baseUploadFields,
        finalStatus: "imported",
        derivativeStatus: "failed",
        pipelineSuccess: false,
        derivativeError,
      }),
    };
  }

  const pipelineOutcome = await importDerivativeService.runImportDerivativePipeline(caller, {
    designId: design.id,
    thumbnailBytes: derivatives.thumbnailBytes,
    previewBytes: derivatives.previewBytes,
  });

  if (!pipelineOutcome.success) {
    return {
      status: "success",
      importSuccess: true,
      pipelineSuccess: false,
      warnings: validationResult.warnings,
      uploadResult: buildUploadResult({
        ...baseUploadFields,
        finalStatus: "imported",
        derivativeStatus: "failed",
        pipelineSuccess: false,
        derivativeError: pipelineOutcome.message,
        cleanupWarning: pipelineOutcome.cleanupWarning ?? null,
      }),
    };
  }

  logPipelineEvent("import.derivatives.completed", { designId: design.id });

  return {
    status: "success",
    importSuccess: true,
    pipelineSuccess: true,
    warnings: validationResult.warnings,
    uploadResult: buildUploadResult({
      ...baseUploadFields,
      finalStatus: "imported",
      derivativeStatus: "ready",
      pipelineSuccess: true,
      thumbnailPath: pipelineOutcome.thumbnailPath,
      previewPath: pipelineOutcome.previewPath,
    }),
  };
}

export const importOrchestrationService = {
  async uploadValidatedPng(
    caller: User,
    validationResult: ValidateSelectedPngFileResult,
  ): Promise<SinglePngUploadOutcome> {
    const outcome = await importValidatedPngFile(caller, validationResult);

    if (outcome.status === "failed") {
      throw new ImportOrchestrationError(outcome.message, outcome.cleanupWarning ?? null);
    }

    return {
      validationResult,
      warnings: outcome.warnings,
      uploadResult: outcome.uploadResult,
      pipelineSuccess: outcome.pipelineSuccess,
    };
  },
};
