import {
  getOriginalStoragePath,
  getPreviewStoragePath,
  getThumbnailStoragePath,
} from "../../../../../../shared/constants/design/designStoragePaths";
import type { ImportDerivativePipelineResult } from "../../../../../../shared/types/import/importOrchestration.types";
import type { User } from "../../users/types/user.types";
import { designDerivativeStorageService } from "../../designs/services/designDerivativeStorageService";
import { designReadyService } from "../../designs/services/designReadyService";
import { designService } from "../../designs/services/designService";

const DERIVATIVE_CLEANUP_WARNING =
  "Uploaded derivative files could not be fully removed from Firebase Storage. Contact an administrator to avoid leaving orphan files.";

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function collectDerivativeCleanupWarning(
  deleteResult: Awaited<ReturnType<typeof designDerivativeStorageService.deleteDesignDerivatives>>,
): string | null {
  const warnings = [deleteResult.thumbnail.warning, deleteResult.preview.warning].filter(
    (warning): warning is string => Boolean(warning),
  );

  if (warnings.length === 0) {
    return null;
  }

  console.error(`Derivative cleanup warnings (${deleteResult.thumbnail.path}):`, warnings.join(" "));
  return DERIVATIVE_CLEANUP_WARNING;
}

async function revertDesignToImported(caller: User, designId: string): Promise<void> {
  try {
    await designService.updateDesign(caller, designId, { status: "imported" }, { allowStatusChange: true });
  } catch (error) {
    console.error(`Failed to revert design ${designId} to imported after derivative failure:`, error);
  }
}

async function rollbackUploadedDerivatives(designId: string): Promise<string | null> {
  try {
    const deleteResult = await designDerivativeStorageService.deleteDesignDerivatives(designId);
    return collectDerivativeCleanupWarning(deleteResult);
  } catch (error) {
    console.error(`Failed to delete derivative files for design ${designId}:`, error);
    return DERIVATIVE_CLEANUP_WARNING;
  }
}

async function rollbackDerivativesAndRevert(
  caller: User,
  designId: string,
  revertStatus: boolean,
): Promise<string | null> {
  const cleanupWarning = await rollbackUploadedDerivatives(designId);

  if (revertStatus) {
    await revertDesignToImported(caller, designId);
  }

  return cleanupWarning;
}

/**
 * Runs the Phase 3C derivative pipeline for a single imported design:
 * processing → upload thumbnail → upload preview → persist derivative paths (status stays imported).
 */
export const importDerivativeService = {
  async runImportDerivativePipeline(
    caller: User,
    input: {
      designId: string;
      thumbnailBytes: Uint8Array;
      previewBytes: Uint8Array;
    },
  ): Promise<ImportDerivativePipelineResult> {
    const { designId, thumbnailBytes, previewBytes } = input;
    const originalPath = getOriginalStoragePath(designId);
    const thumbnailPath = getThumbnailStoragePath(designId);
    const previewPath = getPreviewStoragePath(designId);

    try {
      await designReadyService.markDesignProcessing(caller, designId);
    } catch (error) {
      return {
        success: false,
        message: getErrorMessage(error, "Unable to mark the design as processing."),
      };
    }

    try {
      await designDerivativeStorageService.uploadThumbnailWebp(designId, thumbnailBytes);
    } catch (error) {
      await revertDesignToImported(caller, designId);
      return {
        success: false,
        message: getErrorMessage(error, "Unable to upload the thumbnail WebP to Firebase Storage."),
      };
    }

    try {
      await designDerivativeStorageService.uploadPreviewWebp(designId, previewBytes);
    } catch (error) {
      const cleanupWarning = await rollbackDerivativesAndRevert(caller, designId, true);
      return {
        success: false,
        message: getErrorMessage(error, "Unable to upload the preview WebP to Firebase Storage."),
        cleanupWarning,
      };
    }

    try {
      await designReadyService.markDesignDerivativesComplete(caller, designId, {
        originalPath,
        thumbnailPath,
        previewPath,
      });
    } catch (error) {
      const cleanupWarning = await rollbackDerivativesAndRevert(caller, designId, true);
      return {
        success: false,
        message: getErrorMessage(
          error,
          "Unable to save derivative paths on the design catalog record.",
        ),
        cleanupWarning,
      };
    }

    return {
      success: true,
      originalPath,
      thumbnailPath,
      previewPath,
    };
  },
};
