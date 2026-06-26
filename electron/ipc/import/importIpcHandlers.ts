import type { IpcMainInvokeEvent } from "electron";
import { app, ipcMain } from "electron";

import { runBatchImportDiscovery } from "./importJobRunner";
import {
  validateCancelBatchImportJobRequest,
  validateFinishBatchImportJobRequest,
  validateStartBatchDiscoveryRequest,
} from "./batchImportRequestValidation";
import { cancelBatchImportJob } from "./cancelBatchImportJob";
import { finishBatchImportJob } from "./finishBatchImportJob";
import { IMPORT_IPC_CHANNELS } from "./importIpcChannels";
import {
  markBatchDiscoveryRunning,
  validateBatchDiscoveryStart,
} from "./importBatchSession";
import { clearImportFileSession, isRegisteredImportFilePath, isValidatedImportFilePath, markImportFileValidated } from "./importFileSession";
import { isUnsafeClientFilePath } from "./importPathUtils";
import { importIpcFailure, importIpcSuccess } from "./importIpcResponse";
import {
  assertCanStartBatchImport,
  assertCanStartSingleFileImport,
} from "./importSessionGuard";
import { PngValidationError, validatePngFile } from "./pngValidator";
import { readBatchValidatedPngFileBytes } from "./readBatchValidatedPngFileBytes";
import { enrichReadResultWithDerivatives } from "./enrichReadResultWithDerivatives";
import { mapReadBytesError, readSelectedPngFileBytes } from "./readSelectedPngFileBytes";
import { validateReadPngFileBytesRequest } from "./validateReadPngFileBytesRequest";
import { getSelectedPngPreview } from "./getSelectedPngPreview";
import { selectImportFolder } from "./selectImportFolder";
import { selectImportZipFile } from "./selectImportZipFile";
import { selectMultiplePngFiles } from "./selectMultiplePngFiles";
import { selectSinglePngFile } from "./selectSinglePngFile";
import { registerDevDerivativeVerificationIpc } from "./verifyDerivativeGenerationIpc";
import { ImportLimitExceededError } from "../../../shared/errors/importLimitErrors";
import { ZipExtractionError } from "../../services/import/zipExtractionErrors";

function validateFilePathInput(filePath: unknown, requireValidated = false) {
  if (typeof filePath !== "string") {
    return importIpcFailure("INVALID_INPUT", "A file path string is required.");
  }

  if (isUnsafeClientFilePath(filePath)) {
    return importIpcFailure("INVALID_INPUT", "The provided file path is invalid.");
  }

  if (!isRegisteredImportFilePath(filePath)) {
    return importIpcFailure(
      "INVALID_INPUT",
      "Use a PNG file only after selecting it with the file picker.",
    );
  }

  if (requireValidated && !isValidatedImportFilePath(filePath)) {
    return importIpcFailure(
      "INVALID_INPUT",
      "Read PNG bytes only after the file has passed validation.",
    );
  }

  return null;
}

function mapValidationError(error: unknown) {
  if (error instanceof ImportLimitExceededError) {
    return importIpcFailure("FILE_TOO_LARGE", error.message);
  }

  if (error instanceof PngValidationError) {
    return importIpcFailure("VALIDATION_FAILED", error.message);
  }

  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  ) {
    return importIpcFailure("FILE_NOT_FOUND", "The selected file could not be found.");
  }

  return importIpcFailure("INTERNAL_ERROR", "An unexpected error occurred while validating the PNG file.");
}

function mapPickerError(error: unknown) {
  if (error instanceof ImportLimitExceededError) {
    return importIpcFailure("FILE_TOO_LARGE", error.message);
  }

  if (error instanceof ZipExtractionError && error.code === "FILE_TOO_LARGE") {
    return importIpcFailure("FILE_TOO_LARGE", error.message);
  }

  if (error instanceof Error) {
    if (error.message.includes("up to")) {
      return importIpcFailure("INVALID_INPUT", error.message);
    }

    if (error.message.includes("batch import session is already active")) {
      return importIpcFailure("SESSION_CONFLICT", error.message);
    }

    return importIpcFailure("INTERNAL_ERROR", error.message);
  }

  return importIpcFailure("INTERNAL_ERROR", "An unexpected error occurred while opening the file picker.");
}

async function handleBatchPicker<T>(
  event: IpcMainInvokeEvent,
  picker: (webContentsId: number) => Promise<T>,
) {
  const sessionError = assertCanStartBatchImport<T>();

  if (sessionError) {
    return sessionError;
  }

  try {
    const result = await picker(event.sender.id);
    return importIpcSuccess(result);
  } catch (error) {
    return mapPickerError(error);
  }
}

export function registerImportIpcHandlers(): void {
  ipcMain.handle(IMPORT_IPC_CHANNELS.SELECT_SINGLE_PNG, async () => {
    const sessionError = assertCanStartSingleFileImport();

    if (sessionError) {
      return sessionError;
    }

    try {
      const result = await selectSinglePngFile();

      return importIpcSuccess(result);
    } catch (error) {
      if (error instanceof Error) {
        return importIpcFailure("INTERNAL_ERROR", error.message);
      }

      return importIpcFailure(
        "INTERNAL_ERROR",
        "An unexpected error occurred while opening the file picker.",
      );
    }
  });

  ipcMain.handle(IMPORT_IPC_CHANNELS.CLEAR_SINGLE_PNG_IMPORT, async () => {
    clearImportFileSession();
    return importIpcSuccess({ cleared: true });
  });

  ipcMain.handle(IMPORT_IPC_CHANNELS.VALIDATE_SELECTED_PNG, async (_event, filePath: unknown) => {
    try {
      const validationError = validateFilePathInput(filePath);

      if (validationError) {
        return validationError;
      }

      const result = await validatePngFile(filePath as string);
      markImportFileValidated(filePath as string);

      return importIpcSuccess(result);
    } catch (error) {
      return mapValidationError(error);
    }
  });

  ipcMain.handle(IMPORT_IPC_CHANNELS.READ_SELECTED_PNG_BYTES, async (event, payload: unknown) => {
    try {
      const validated = validateReadPngFileBytesRequest(event.sender.id, payload);

      if (!("mode" in validated)) {
        return validated;
      }

      const baseResult =
        validated.mode === "batch"
          ? await readBatchValidatedPngFileBytes(validated.request.filePath)
          : await readSelectedPngFileBytes(validated.filePath);

      const result = await enrichReadResultWithDerivatives(
        baseResult,
        validated.includeDerivatives,
      );

      return importIpcSuccess(result);
    } catch (error) {
      const mappedError = mapReadBytesError(error);
      return importIpcFailure(mappedError.code, mappedError.message);
    }
  });

  ipcMain.handle(IMPORT_IPC_CHANNELS.GET_SELECTED_PNG_PREVIEW, async (_event, filePath: unknown) => {
    try {
      const validationError = validateFilePathInput(filePath, true);

      if (validationError) {
        return validationError;
      }

      const preview = getSelectedPngPreview(filePath as string);

      if (!preview) {
        return importIpcFailure(
          "VALIDATION_FAILED",
          "A preview could not be generated for the selected PNG file.",
        );
      }

      return importIpcSuccess(preview);
    } catch {
      return importIpcFailure(
        "INTERNAL_ERROR",
        "An unexpected error occurred while generating the PNG preview.",
      );
    }
  });

  ipcMain.handle(IMPORT_IPC_CHANNELS.SELECT_MULTIPLE_PNG, async (event) => {
    return handleBatchPicker(event, selectMultiplePngFiles);
  });

  ipcMain.handle(IMPORT_IPC_CHANNELS.SELECT_IMPORT_FOLDER, async (event) => {
    return handleBatchPicker(event, selectImportFolder);
  });

  ipcMain.handle(IMPORT_IPC_CHANNELS.SELECT_IMPORT_ZIP, async (event) => {
    return handleBatchPicker(event, selectImportZipFile);
  });

  ipcMain.handle(IMPORT_IPC_CHANNELS.START_BATCH_DISCOVERY, async (event, payload: unknown) => {
    const validated = validateStartBatchDiscoveryRequest(payload);

    if ("error" in validated && validated.error) {
      return validated.error;
    }

    const { jobId, sourceType } = validated.request;

    const startError = validateBatchDiscoveryStart(jobId, event.sender.id, sourceType);

    if (startError) {
      return importIpcFailure("INVALID_INPUT", startError);
    }

    if (!markBatchDiscoveryRunning(jobId)) {
      return importIpcFailure(
        "INVALID_INPUT",
        "Batch discovery is already in progress for this job.",
      );
    }

    void runBatchImportDiscovery({
      jobId,
      sourceType,
      webContents: event.sender,
    });

    return importIpcSuccess({
      jobId,
      accepted: true,
    });
  });

  ipcMain.handle(IMPORT_IPC_CHANNELS.CANCEL_BATCH_JOB, async (event, payload: unknown) => {
    const validated = validateCancelBatchImportJobRequest(payload);

    if ("error" in validated && validated.error) {
      return validated.error;
    }

    const result = cancelBatchImportJob(validated.request, event.sender.id);

    if (!result.canceled) {
      return importIpcFailure(
        "INVALID_INPUT",
        "The batch import job could not be canceled. It may not exist or is no longer active.",
      );
    }

    return importIpcSuccess(result);
  });

  ipcMain.handle(IMPORT_IPC_CHANNELS.FINISH_BATCH_JOB, async (event, payload: unknown) => {
    const validated = validateFinishBatchImportJobRequest(payload);

    if ("error" in validated && validated.error) {
      return validated.error;
    }

    const result = await finishBatchImportJob(validated.request, event.sender.id);

    if (!result.sessionCleared) {
      return importIpcFailure(
        "INVALID_INPUT",
        "The batch import job could not be finished. It may not exist or is no longer active.",
      );
    }

    return importIpcSuccess(result);
  });

  if (!app.isPackaged) {
    registerDevDerivativeVerificationIpc();
  }
}
