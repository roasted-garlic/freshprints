import {
  getOriginalStoragePath,
  getPreviewStoragePath,
  getThumbnailStoragePath,
} from "@fresh-prints/shared/constants/design/designStoragePaths";
import type { ImportDerivativePipelineResult } from "@fresh-prints/shared/types/import/importOrchestration.types";
import type { User } from "../../users/types/user.types";
import type { DesignAuthoritySnapshot } from "../../designs/types/design.types";
import { designDerivativeStorageService } from "../../designs/services/designDerivativeStorageService";
import { designReadyService } from "../../designs/services/designReadyService";
import { designService } from "../../designs/services/designService";
import {
  logDerivativeLocusDiag,
  sanitizeFirebaseError,
} from "../../../shared/utils/derivativeLocusDiagnostic";

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
    logDerivativeLocusDiag({
      stage: "rollback.revert_imported",
      designId,
      ok: true,
    });
  } catch (error) {
    const sanitized = sanitizeFirebaseError(error);
    logDerivativeLocusDiag({
      stage: "rollback.revert_imported",
      designId,
      ok: false,
      detail: { code: sanitized.code, message: sanitized.message },
    });
    console.error(`Failed to revert design ${designId} to imported after derivative failure:`, error);
  }
}

async function rollbackUploadedDerivatives(designId: string): Promise<string | null> {
  try {
    const deleteResult = await designDerivativeStorageService.deleteDesignDerivatives(designId);
    logDerivativeLocusDiag({
      stage: "rollback.delete_derivatives",
      designId,
      ok: deleteResult.thumbnail.deleted || deleteResult.preview.deleted,
      detail: {
        thumbnailDeleted: deleteResult.thumbnail.deleted,
        previewDeleted: deleteResult.preview.deleted,
        thumbnailWarning: deleteResult.thumbnail.warning ?? null,
        previewWarning: deleteResult.preview.warning ?? null,
      },
    });
    return collectDerivativeCleanupWarning(deleteResult);
  } catch (error) {
    const sanitized = sanitizeFirebaseError(error);
    logDerivativeLocusDiag({
      stage: "rollback.delete_derivatives",
      designId,
      ok: false,
      detail: { code: sanitized.code, message: sanitized.message },
    });
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
      /** Same-stack createDesign authority; used only before Storage uploads (P1 I2/I3). */
      knownAuthority?: DesignAuthoritySnapshot;
    },
  ): Promise<ImportDerivativePipelineResult> {
    const { designId, thumbnailBytes, previewBytes, knownAuthority } = input;
    const originalPath = getOriginalStoragePath(designId);
    const thumbnailPath = getThumbnailStoragePath(designId);
    const previewPath = getPreviewStoragePath(designId);

    logDerivativeLocusDiag({
      stage: "pipeline.mark_processing.start",
      designId,
      detail: {
        thumbnailCtor: thumbnailBytes?.constructor?.name ?? "missing",
        thumbnailByteLength: thumbnailBytes?.byteLength ?? 0,
        thumbnailIsUint8Array: thumbnailBytes instanceof Uint8Array,
        previewCtor: previewBytes?.constructor?.name ?? "missing",
        previewByteLength: previewBytes?.byteLength ?? 0,
        previewIsUint8Array: previewBytes instanceof Uint8Array,
      },
    });

    try {
      await designReadyService.markDesignProcessing(caller, designId, knownAuthority);
      logDerivativeLocusDiag({ stage: "pipeline.mark_processing.pass", designId, ok: true });
    } catch (error) {
      const sanitized = sanitizeFirebaseError(error);
      logDerivativeLocusDiag({
        stage: "pipeline.mark_processing.fail",
        designId,
        ok: false,
        detail: { code: sanitized.code, message: sanitized.message },
      });
      return {
        success: false,
        message: getErrorMessage(error, "Unable to mark the design as processing."),
      };
    }

    logDerivativeLocusDiag({ stage: "pipeline.upload_thumbnail.start", designId });
    try {
      await designDerivativeStorageService.uploadThumbnailWebp(designId, thumbnailBytes);
      logDerivativeLocusDiag({ stage: "pipeline.upload_thumbnail.pass", designId, ok: true });
    } catch (error) {
      const sanitized = sanitizeFirebaseError(error);
      logDerivativeLocusDiag({
        stage: "pipeline.upload_thumbnail.fail",
        designId,
        ok: false,
        detail: { code: sanitized.code, message: sanitized.message },
      });
      logDerivativeLocusDiag({
        stage: "rollback.invoked",
        designId,
        detail: { reason: "upload_thumbnail" },
      });
      await revertDesignToImported(caller, designId);
      return {
        success: false,
        message: getErrorMessage(error, "Unable to upload the thumbnail WebP to Firebase Storage."),
      };
    }

    logDerivativeLocusDiag({ stage: "pipeline.upload_preview.start", designId });
    try {
      await designDerivativeStorageService.uploadPreviewWebp(designId, previewBytes);
      logDerivativeLocusDiag({ stage: "pipeline.upload_preview.pass", designId, ok: true });
    } catch (error) {
      const sanitized = sanitizeFirebaseError(error);
      logDerivativeLocusDiag({
        stage: "pipeline.upload_preview.fail",
        designId,
        ok: false,
        detail: { code: sanitized.code, message: sanitized.message },
      });
      logDerivativeLocusDiag({
        stage: "rollback.invoked",
        designId,
        detail: { reason: "upload_preview" },
      });
      const cleanupWarning = await rollbackDerivativesAndRevert(caller, designId, true);
      return {
        success: false,
        message: getErrorMessage(error, "Unable to upload the preview WebP to Firebase Storage."),
        cleanupWarning,
      };
    }

    logDerivativeLocusDiag({ stage: "pipeline.mark_derivatives_complete.start", designId });
    try {
      // I4 retained: fresh authority read inside markDesignDerivativesComplete after Storage.
      await designReadyService.markDesignDerivativesComplete(caller, designId, {
        originalPath,
        thumbnailPath,
        previewPath,
      });
      logDerivativeLocusDiag({
        stage: "pipeline.mark_derivatives_complete.pass",
        designId,
        ok: true,
      });
    } catch (error) {
      const sanitized = sanitizeFirebaseError(error);
      logDerivativeLocusDiag({
        stage: "pipeline.mark_derivatives_complete.fail",
        designId,
        ok: false,
        detail: { code: sanitized.code, message: sanitized.message },
      });
      logDerivativeLocusDiag({
        stage: "rollback.invoked",
        designId,
        detail: { reason: "mark_derivatives_complete" },
      });
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
