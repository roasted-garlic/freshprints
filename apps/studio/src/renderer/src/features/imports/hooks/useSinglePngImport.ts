import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { useUploadActivity } from "../../../shared/hooks/useUploadActivity";
import type {
  ImportIpcError,
  ImportOriginalUploadResult,
  ValidateSelectedPngFileResult,
} from "@fresh-prints/shared/types/import/importIpc.types";
import { ImportOrchestrationError } from "../services/importOrchestrationError";
import { importDesktopService } from "../services/importDesktopService";
import { importOrchestrationService } from "../services/importOrchestrationService";
import { UploadCancelToken } from "../utils/uploadCancelToken";
import { releaseSinglePngImportSession } from "../utils/releaseSinglePngImportSession";
import { IMPORT_SESSION_DEFAULT_SETTINGS } from "../constants/importSessionSettings";
import type { ImportSessionSettings } from "../constants/importSessionSettings";
import type { ImportItemBackgroundOverride } from "@fresh-prints/shared/utils/resolveImportArtworkBackgroundDecision";
import type { ImportItemHalftoneOverride } from "@fresh-prints/shared/utils/resolveImportArtworkBackgroundDecision";

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
  suggestDarkArtworkBackground: boolean;
  itemBackgroundOverride: ImportItemBackgroundOverride;
  itemHalftoneOverride: ImportItemHalftoneOverride;
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
  suggestDarkArtworkBackground: false,
  itemBackgroundOverride: "auto",
  itemHalftoneOverride: "auto",
  selectionCanceled: false,
  uploadError: null,
  uploadResult: null,
  uploadWarning: null,
  validationError: null,
  validationResult: null,
};

async function loadPreviewWithBackgroundHint(filePath: string): Promise<{
  dataUrl: string | null;
  suggestDarkArtworkBackground: boolean;
}> {
  const previewResult = await importDesktopService.getSelectedPngPreview(filePath);

  if (!previewResult.success) {
    return { dataUrl: null, suggestDarkArtworkBackground: false };
  }

  return {
    dataUrl: previewResult.data.dataUrl,
    suggestDarkArtworkBackground: previewResult.data.suggestDarkArtworkBackground === true,
  };
}

function isSingleImportWorkflowActive(phase: SinglePngImportPhase): boolean {
  return phase !== "idle" && phase !== "upload-complete";
}

export function useSinglePngImport(options: {
  getSessionSettings?: () => ImportSessionSettings;
} = {}) {
  const { user } = useAuth();
  const [state, setState] = useState<UseSinglePngImportState>(initialState);
  const { setUploadActive, registerCancelHandler } = useUploadActivity();
  const uploadCancelTokenRef = useRef<UploadCancelToken | null>(null);
  const uploadPromiseRef = useRef<Promise<void> | null>(null);
  const getSessionSettingsRef = useRef(options.getSessionSettings);
  getSessionSettingsRef.current = options.getSessionSettings;

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
      suggestDarkArtworkBackground: false,
      itemBackgroundOverride: "auto",
      itemHalftoneOverride: "auto",
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

    const preview = await loadPreviewWithBackgroundHint(validationResult.data.filePath);

    setState({
      isBusy: false,
      phase: "validated",
      previewDataUrl: preview.dataUrl,
      suggestDarkArtworkBackground: preview.suggestDarkArtworkBackground,
      itemBackgroundOverride: "auto",
      itemHalftoneOverride: "auto",
      selectionCanceled: false,
      uploadError: null,
      uploadResult: null,
      uploadWarning: null,
      validationError: null,
      validationResult: validationResult.data,
    });
  }, []);

  const setItemBackgroundOverride = useCallback((itemBackgroundOverride: ImportItemBackgroundOverride) => {
    setState((current) => ({ ...current, itemBackgroundOverride }));
  }, []);

  const setItemHalftoneOverride = useCallback((itemHalftoneOverride: ImportItemHalftoneOverride) => {
    setState((current) => ({ ...current, itemHalftoneOverride }));
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
    const suggestDarkArtworkBackground = state.suggestDarkArtworkBackground;
    const itemBackgroundOverride = state.itemBackgroundOverride;
    const itemHalftoneOverride = state.itemHalftoneOverride;

    setState((current) => ({
      ...current,
      isBusy: true,
      phase: "uploading",
      uploadError: null,
      uploadWarning: null,
    }));

    const cancelToken = new UploadCancelToken();
    uploadCancelTokenRef.current = cancelToken;

    const runUploadAndCleanup = async (): Promise<void> => {
      try {
        const sessionSettings =
          getSessionSettingsRef.current?.() ?? IMPORT_SESSION_DEFAULT_SETTINGS;
        const outcome = await importOrchestrationService.uploadValidatedPng(
          user,
          validationResult,
          cancelToken,
          {
            halftoneMode: sessionSettings.halftoneMode,
            backgroundMode: sessionSettings.backgroundMode,
            itemBackgroundOverride,
            itemHalftoneOverride,
            smartProfileImportPresets: sessionSettings.smartProfilePresets,
          },
        );

        await releaseSinglePngImportSession();

        setState({
          isBusy: false,
          phase: "upload-complete",
          previewDataUrl,
          suggestDarkArtworkBackground,
          itemBackgroundOverride,
          itemHalftoneOverride,
          selectionCanceled: false,
          uploadError: null,
          uploadResult: outcome.uploadResult,
          uploadWarning: outcome.uploadResult.cleanupWarning ?? null,
          validationError: null,
          validationResult: outcome.validationResult,
        });
      } catch (error) {
        await releaseSinglePngImportSession();

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
          suggestDarkArtworkBackground,
          itemBackgroundOverride,
          itemHalftoneOverride,
          selectionCanceled: false,
          uploadError,
          uploadResult: null,
          uploadWarning,
          validationError: null,
          validationResult,
        });
      } finally {
        uploadCancelTokenRef.current = null;
        uploadPromiseRef.current = null;
      }
    };

    const uploadPromise = runUploadAndCleanup();
    uploadPromiseRef.current = uploadPromise;
    await uploadPromise;
  }, [
    state.previewDataUrl,
    state.suggestDarkArtworkBackground,
    state.itemBackgroundOverride,
    state.itemHalftoneOverride,
    state.validationResult,
    user,
  ]);

  const cancelImport = useCallback(async () => {
    if (state.phase === "uploading") {
      // Cancel the in-flight upload and wait for `uploadValidatedPng`'s own try/finally to fully
      // settle (including its `releaseSinglePngImportSession` cleanup) before resetting UI state —
      // matches cancelling at any other phase instead of leaving the main-process single-file
      // session active.
      uploadCancelTokenRef.current?.cancel();
      await uploadPromiseRef.current;
      setState(initialState);
      return;
    }

    await releaseSinglePngImportSession();
    setState(initialState);
  }, [state.phase]);

  const isWorkflowActive = isSingleImportWorkflowActive(state.phase);

  // A main-process single-file session is held open from the moment a file is selected (not just
  // during upload) — see `electron/ipc/import/importFileSession.ts`'s `isSingleFileImportSessionActive`.
  // Registering `cancelImport` itself (rather than a narrower upload-only handler) means leaving
  // the app mid-selection/validation/validated via the Sidebar nav guard or the Electron close
  // guard runs the exact same cleanup path as clicking "Cancel Upload" would at that phase, so the
  // session is never orphaned.
  useEffect(() => {
    setUploadActive(isWorkflowActive);
    registerCancelHandler(isWorkflowActive ? cancelImport : null);

    return () => {
      // If the page unmounts anyway (e.g. programmatic navigation outside the guard), never leave
      // a stale "upload active" flag or a cancel handler pointing at an unmounted hook behind.
      setUploadActive(false);
      registerCancelHandler(null);
    };
  }, [isWorkflowActive, setUploadActive, registerCancelHandler, cancelImport]);

  const canUpload =
    state.validationResult !== null &&
    state.phase !== "uploading" &&
    state.uploadResult === null;

  return {
    ...state,
    canUpload,
    cancelImport,
    isWorkflowActive,
    reset: cancelImport,
    selectAndValidatePng,
    setItemBackgroundOverride,
    setItemHalftoneOverride,
    uploadValidatedPng,
  };
}
