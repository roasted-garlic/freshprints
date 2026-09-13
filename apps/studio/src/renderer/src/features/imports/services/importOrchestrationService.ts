import type {
  ImportOriginalUploadResult,
  ImportPngWarning,
  ValidateSelectedPngFileResult,
} from "@fresh-prints/shared/types/import/importIpc.types";
import {
  formatDerivativeGenerationError,
  type ImportDerivativeStatus,
  type ImportFinalDesignStatus,
} from "@fresh-prints/shared/types/import/importOrchestration.types";
import type {
  ImportArtworkBackgroundMode,
  ImportHalftoneMode,
} from "@fresh-prints/shared/types/design/artworkBackgroundSource.types";
import {
  buildImportDesignBackgroundAndHalftoneFields,
  type ImportItemBackgroundOverride,
  type ImportItemHalftoneOverride,
} from "@fresh-prints/shared/utils/resolveImportArtworkBackgroundDecision";
import { buildImportPrintSizeCreateFields } from "@fresh-prints/shared/utils/importPrintSizeMetadata";
import { formatPrintSizeRejectedMessage } from "@fresh-prints/shared/utils/importPrintSizeMessages";
import type { User } from "../../users/types/user.types";
import { designService } from "../../designs/services/designService";
import { importDesignTitleFromFileName } from "../utils/importDesignTitleFromFileName";
import { resolveImportDpi } from "../utils/resolveImportDpi";
import { importDerivativeService } from "./importDerivativeService";
import { importDesktopService } from "./importDesktopService";
import { ImportOrchestrationError } from "./importOrchestrationError";
import { importUploadService } from "./importUploadService";
import type { UploadCancelToken } from "../utils/uploadCancelToken";
import { logPipelineEvent } from "../../../shared/utils/pipelineLog";
import {
  logDerivativeLocusDiag,
  webpMagicHex12,
} from "../../../shared/utils/derivativeLocusDiagnostic";

export interface SinglePngUploadOutcome {
  uploadResult: ImportOriginalUploadResult;
  validationResult: ValidateSelectedPngFileResult;
  warnings: ImportPngWarning[];
  pipelineSuccess: boolean;
}

export interface ImportValidatedPngFileOptions {
  jobId?: string;
  cancelToken?: UploadCancelToken;
  importRelativePath?: string;
  /** Session-scoped batch/single import controls (defaults: normal + auto). */
  halftoneMode?: ImportHalftoneMode;
  backgroundMode?: ImportArtworkBackgroundMode;
  itemBackgroundOverride?: ImportItemBackgroundOverride;
  itemHalftoneOverride?: ImportItemHalftoneOverride;
  /** Optional Smart Profile presets from Studio session state. */
  smartProfileImportPresets?: Partial<import("@fresh-prints/shared/types/catalog/smartProfile.types").SmartProfileDimensionLists>;
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

  if (options?.cancelToken?.isCancelled) {
    return {
      status: "failed",
      message: "The upload was canceled.",
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
    logDerivativeLocusDiag({
      stage: "ipc.read.fail",
      fileName: validationResult.fileName,
      jobId: options?.jobId,
      ok: false,
      detail: { message: readResult.error.message },
    });
    return {
      status: "failed",
      message: readResult.error.message,
    };
  }

  const derivativesPresent = Boolean(readResult.data.derivatives);
  const derivativeErrorPresent = Boolean(readResult.data.derivativeError);
  logDerivativeLocusDiag({
    stage: "ipc.read.return",
    fileName: validationResult.fileName,
    jobId: options?.jobId,
    ok: true,
    detail: {
      derivativesPresent,
      derivativeErrorPresent,
      thumbnailCtor: readResult.data.derivatives?.thumbnailBytes?.constructor?.name ?? null,
      thumbnailByteLength: readResult.data.derivatives?.thumbnailBytes?.byteLength ?? null,
      thumbnailIsUint8Array:
        readResult.data.derivatives?.thumbnailBytes instanceof Uint8Array,
      thumbnailIsView: readResult.data.derivatives?.thumbnailBytes
        ? ArrayBuffer.isView(readResult.data.derivatives.thumbnailBytes)
        : null,
      thumbnailMagicHex12: webpMagicHex12(readResult.data.derivatives?.thumbnailBytes),
      previewCtor: readResult.data.derivatives?.previewBytes?.constructor?.name ?? null,
      previewByteLength: readResult.data.derivatives?.previewBytes?.byteLength ?? null,
      previewIsUint8Array: readResult.data.derivatives?.previewBytes instanceof Uint8Array,
      previewIsView: readResult.data.derivatives?.previewBytes
        ? ArrayBuffer.isView(readResult.data.derivatives.previewBytes)
        : null,
      previewMagicHex12: webpMagicHex12(readResult.data.derivatives?.previewBytes),
      derivativeErrorCode:
        readResult.data.derivativeError &&
        typeof readResult.data.derivativeError === "object" &&
        "code" in readResult.data.derivativeError
          ? String((readResult.data.derivativeError as { code: string }).code)
          : null,
    },
  });

  // Owner QA Amendment 3, Failure 2: byte-limit normalization may have proportionally downscaled
  // the final output. Recalculate stored print size from the pixels actually persisted, so the
  // catalog record never describes pre-normalization dimensions.
  const normalizedWidth = readResult.data.normalizedWidth;
  const normalizedHeight = readResult.data.normalizedHeight;
  let effectiveWidth = validationResult.width;
  let effectiveHeight = validationResult.height;
  let effectivePrintSizeFields = printSizeFields;

  if (normalizedWidth && normalizedHeight) {
    const renormalized = buildImportPrintSizeCreateFields({
      pixelWidth: normalizedWidth,
      pixelHeight: normalizedHeight,
      assessment: validationResult.printSizeAssessment,
      metadataDpiX: validationResult.dpiX,
      metadataDpiY: validationResult.dpiY,
    });

    if ("error" in renormalized) {
      return {
        status: "failed",
        message: renormalized.error,
      };
    }

    effectiveWidth = normalizedWidth;
    effectiveHeight = normalizedHeight;
    effectivePrintSizeFields = renormalized;
  }

  let uploadResult;

  try {
    uploadResult = await importUploadService.uploadOriginalPng(
      designId,
      readResult.data.bytes,
      options?.cancelToken,
    );
  } catch (error) {
    return {
      status: "failed",
      message:
        error instanceof Error
          ? error.message
          : "Unable to upload the PNG file to Firebase Storage.",
    };
  }

  let designAuthority;

  try {
    const bgHalftoneFields = buildImportDesignBackgroundAndHalftoneFields({
      backgroundMode: options?.backgroundMode ?? "auto",
      halftoneMode: options?.halftoneMode ?? "normal",
      autoSuggestsDark: readResult.data.suggestDarkArtworkBackground === true,
      itemBackgroundOverride: options?.itemBackgroundOverride ?? "auto",
      itemHalftoneOverride: options?.itemHalftoneOverride ?? "auto",
      callerId: caller.id,
    });

    designAuthority = await designService.createDesign(caller, {
      id: designId,
      title: importDesignTitleFromFileName(validationResult.fileName),
      description: "",
      status: "imported",
      originalPath: uploadResult.originalPath,
      thumbnailPath: "",
      previewPath: "",
      tags: [],
      ...(options?.jobId ? { importBatchId: options.jobId } : {}),
      importSourceFileName: validationResult.fileName,
      ...(options?.importRelativePath ? { importRelativePath: options.importRelativePath } : {}),
      width: effectiveWidth,
      height: effectiveHeight,
      dpi: resolveImportDpi(validationResult),
      ...effectivePrintSizeFields,
      wasUpscaled: validationResult.wasUpscaled,
      upscaleFactor: validationResult.upscaleFactor,
      upscalePassCount: validationResult.upscalePassCount,
      approvedMaxPrintWidthInches: validationResult.approvedMaxPrintWidthInches,
      approvedMaxPrintHeightInches: validationResult.approvedMaxPrintHeightInches,
      sizingPolicyVersion: validationResult.sizingPolicyVersion,
      ...bgHalftoneFields,
      aiReviewStatus: "pending",
      aiReviewed: false,
      aiProcessed: false,
      smartProfileImportPresets: options?.smartProfileImportPresets,
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

  const design = designAuthority.design;

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

    logDerivativeLocusDiag({
      stage: "final.pipeline",
      designId: design.id,
      fileName: validationResult.fileName,
      jobId: options?.jobId,
      ok: false,
      detail: {
        pipelineSuccess: false,
        derivativeStatus: "failed",
        derivativeError,
        aiCallbackInvoked: false,
      },
    });

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
    knownAuthority: designAuthority,
  });

  if (!pipelineOutcome.success) {
    logDerivativeLocusDiag({
      stage: "final.pipeline",
      designId: design.id,
      fileName: validationResult.fileName,
      jobId: options?.jobId,
      ok: false,
      detail: {
        pipelineSuccess: false,
        derivativeStatus: "failed",
        derivativeError: pipelineOutcome.message,
        aiCallbackInvoked: false,
      },
    });
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
  logDerivativeLocusDiag({
    stage: "final.pipeline",
    designId: design.id,
    fileName: validationResult.fileName,
    jobId: options?.jobId,
    ok: true,
    detail: {
      pipelineSuccess: true,
      derivativeStatus: "ready",
      thumbnailPath: pipelineOutcome.thumbnailPath,
      previewPath: pipelineOutcome.previewPath,
      aiCallbackInvoked: "deferred_to_batch_hook",
    },
  });

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
    cancelToken?: UploadCancelToken,
    sessionOptions?: {
      halftoneMode?: ImportHalftoneMode;
      backgroundMode?: ImportArtworkBackgroundMode;
      itemBackgroundOverride?: ImportItemBackgroundOverride;
      itemHalftoneOverride?: ImportItemHalftoneOverride;
      smartProfileImportPresets?: Partial<import("@fresh-prints/shared/types/catalog/smartProfile.types").SmartProfileDimensionLists>;
    },
  ): Promise<SinglePngUploadOutcome> {
    const outcome = await importValidatedPngFile(caller, validationResult, {
      cancelToken,
      halftoneMode: sessionOptions?.halftoneMode,
      backgroundMode: sessionOptions?.backgroundMode,
      itemBackgroundOverride: sessionOptions?.itemBackgroundOverride,
      itemHalftoneOverride: sessionOptions?.itemHalftoneOverride,
      smartProfileImportPresets: sessionOptions?.smartProfileImportPresets,
    });

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
