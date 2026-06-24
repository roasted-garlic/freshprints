import { useCallback, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import type {
  ImportIpcError,
  ImportOriginalUploadResult,
  ValidateSelectedPngFileResult,
} from "../../../../../../shared/types/import/importIpc.types";
import { ImportOrchestrationError } from "../services/importOrchestrationError";
import { importDesktopService } from "../services/importDesktopService";
import { importOrchestrationService } from "../services/importOrchestrationService";
import { releaseSinglePngImportSession } from "../utils/releaseSinglePngImportSession";

export type SinglePngImportPhase =
  | "idle"
  | "selecting"
  | "validating"
  | "validated"
  | "uploading"
  | "upload-complete";

interface UseSinglePngImportState {
  isBusy: boolean;
  phase: SinglePngImportPhase;
  previewDataUrl: string | null;
  selectionCanceled: boolean;
  uploadError: string | null;
  uploadResult: ImportOriginalUploadResult | null;
  uploadWarning: string | null;
  validationError: ImportIpcError | null;
  validationResult: ValidateSelectedPngFileResult | null;
}

const initialState: UseSinglePngImportState = {
  isBusy: false,
  phase: "idle",
  previewDataUrl: null,
  selectionCanceled: false,
  uploadError: null,
  uploadResult: null,
  uploadWarning: null,
  validationError: null,
  validationResult: null,
};

async function loadPreviewDataUrl(filePath: string): Promise<string | null> {
  const previewResult = await importDesktopService.getSelectedPngPreview(filePath);

  if (!previewResult.success) {
    return null;
  }

  return previewResult.data.dataUrl;
}

function isSingleImportWorkflowActive(phase: SinglePngImportPhase): boolean {
  return phase !== "idle" && phase !== "upload-complete";
}

export function useSinglePngImport() {
  const { user } = useAuth();
  const [state, setState] = useState<UseSinglePngImportState>(initialState);

  const selectAndValidatePng = useCallback(async () => {
    setState({
      ...initialState,
      isBusy: true,
      phase: "selecting",
    });

    const selectionResult = await importDesktopService.selectSinglePngFile();

    if (!selectionResult.success) {
      await releaseSinglePngImportSession();
      setState({
        ...initialState,
        validationError: selectionResult.error,
      });
      return;
    }

    if (selectionResult.data.canceled || !selectionResult.data.file) {
      await releaseSinglePngImportSession();
      setState({
        ...initialState,
        selectionCanceled: true,
      });
      return;
    }

    setState((current) => ({
      ...current,
      phase: "validating",
      isBusy: true,
      selectionCanceled: false,
      uploadError: null,
      uploadResult: null,
      uploadWarning: null,
      validationError: null,
      validationResult: null,
      previewDataUrl: null,
    }));

    const validationResult = await importDesktopService.validateSelectedPngFile(
      selectionResult.data.file.filePath,
    );

    if (!validationResult.success) {
      await releaseSinglePngImportSession();
      setState({
        ...initialState,
        validationError: validationResult.error,
      });
      return;
    }

    const previewDataUrl = await loadPreviewDataUrl(validationResult.data.filePath);

    setState({
      isBusy: false,
      phase: "validated",
      previewDataUrl,
      selectionCanceled: false,
      uploadError: null,
      uploadResult: null,
      uploadWarning: null,
      validationError: null,
      validationResult: validationResult.data,
    });
  }, []);

  const uploadValidatedPng = useCallback(async () => {
    if (!state.validationResult) {
      return;
    }

    if (!user) {
      setState((current) => ({
        ...current,
        isBusy: false,
        phase: "validated",
        uploadError: "You must be signed in to import designs.",
        uploadWarning: null,
      }));
      return;
    }

    const validationResult = state.validationResult;
    const previewDataUrl = state.previewDataUrl;

    setState((current) => ({
      ...current,
      isBusy: true,
      phase: "uploading",
      uploadError: null,
      uploadWarning: null,
    }));

    try {
      const outcome = await importOrchestrationService.uploadValidatedPng(user, validationResult);

      await releaseSinglePngImportSession();

      setState({
        isBusy: false,
        phase: "upload-complete",
        previewDataUrl,
        selectionCanceled: false,
        uploadError: null,
        uploadResult: outcome.uploadResult,
        uploadWarning: outcome.uploadResult.cleanupWarning ?? null,
        validationError: null,
        validationResult: outcome.validationResult,
      });
    } catch (error) {
      const uploadError =
        error instanceof Error
          ? error.message
          : "Unable to upload the PNG file. Please try again.";
      const uploadWarning =
        error instanceof ImportOrchestrationError ? error.cleanupWarning : null;

      setState({
        isBusy: false,
        phase: "validated",
        previewDataUrl,
        selectionCanceled: false,
        uploadError,
        uploadResult: null,
        uploadWarning,
        validationError: null,
        validationResult,
      });
    }
  }, [state.previewDataUrl, state.validationResult, user]);

  const cancelImport = useCallback(async () => {
    await releaseSinglePngImportSession();
    setState(initialState);
  }, []);

  const canUpload =
    state.validationResult !== null &&
    state.phase !== "uploading" &&
    state.uploadResult === null;

  const isWorkflowActive = isSingleImportWorkflowActive(state.phase);

  return {
    ...state,
    canUpload,
    cancelImport,
    isWorkflowActive,
    reset: cancelImport,
    selectAndValidatePng,
    uploadValidatedPng,
  };
}
