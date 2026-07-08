import { useCallback, useEffect, useRef, useState } from "react";

import type {
  BatchDiscoveryCompleteEvent,
  BatchImportSourceType,
} from "@fresh-prints/shared/types/import/batchImport.types";

import { useAuth } from "../../auth/hooks/useAuth";
import { useUploadActivity } from "../../../shared/hooks/useUploadActivity";
import { importBatchOrchestrationService } from "../services/importBatchOrchestrationService";
import { importDesktopService } from "../services/importDesktopService";
import type { UseBatchImportReturn, UseBatchImportState } from "../types/batchImportHook.types";
import { UploadCancelToken } from "../utils/uploadCancelToken";
import {
  buildTruncatedDiscoveryWarning,
  buildUploadWarning,
  mapDiscoveryProgressToHookProgress,
  mapUploadProgressToHookProgress,
} from "../utils/batchImportProgressMappers";
import { getValidatedManifestFiles } from "../utils/batchImportDisplay";

const initialState: UseBatchImportState = {
  phase: "idle",
  isBusy: false,
  jobId: null,
  sourceType: null,
  discoveryResult: null,
  uploadReport: null,
  error: null,
  warning: null,
  progress: null,
  excludedFilePaths: [],
};

/**
 * A batch session is "active" (holds a main-process session that must be cleaned up before
 * leaving) for the same phases `ImportsPage.tsx`'s `isBatchImportBlockingSingleImport` already
 * treats as blocking — from the moment file selection starts through upload, not just during the
 * upload phase itself. Selecting/discovering/ready-to-upload all hold an open main-process batch
 * session (`electron/ipc/import/importBatchSession.ts`) that must be released via
 * `cancelBatchJob`/`finishBatchJob` before another batch or single import can start.
 */
function isBatchSessionActive(phase: UseBatchImportState["phase"]): boolean {
  return (
    phase === "selecting" ||
    phase === "discovering" ||
    phase === "ready-to-upload" ||
    phase === "uploading"
  );
}

async function finishBatchJobSafely(jobId: string): Promise<void> {
  const result = await importDesktopService.finishBatchJob({ jobId });

  if (!result.success) {
    console.error("finishBatchJob failed:", result.error.message);
  }
}

export function useBatchImport(): UseBatchImportReturn {
  const { user } = useAuth();
  const [state, setState] = useState<UseBatchImportState>(initialState);
  const { setUploadActive, registerCancelHandler } = useUploadActivity();

  const activeJobIdRef = useRef<string | null>(null);
  const operationIdRef = useRef(0);
  const uploadCancelTokenRef = useRef<UploadCancelToken | null>(null);
  const uploadBatchPromiseRef = useRef<Promise<void> | null>(null);

  const isCurrentOperation = useCallback((operationId: number) => {
    return operationIdRef.current === operationId;
  }, []);

  const beginOperation = useCallback(() => {
    operationIdRef.current += 1;
    return operationIdRef.current;
  }, []);

  const handleDiscoveryComplete = useCallback(
    async (event: BatchDiscoveryCompleteEvent) => {
      if (event.jobId !== activeJobIdRef.current) {
        return;
      }

      const discoveryWarning = buildTruncatedDiscoveryWarning(event);

      if (event.canceled) {
        beginOperation();
        await finishBatchJobSafely(event.jobId);
        activeJobIdRef.current = null;
        setState(initialState);
        return;
      }

      setState((current) => ({
        ...current,
        phase: "ready-to-upload",
        isBusy: false,
        discoveryResult: event,
        excludedFilePaths: [],
        error: null,
        warning: discoveryWarning,
        progress: current.progress
          ? {
              ...current.progress,
              phase: "complete",
              completedCount: event.files.length,
              totalCount: event.files.length,
            }
          : null,
      }));
    },
    [beginOperation],
  );

  const handleBatchJobError = useCallback(async (event: { jobId: string; message: string }) => {
    if (event.jobId !== activeJobIdRef.current) {
      return;
    }

    await finishBatchJobSafely(event.jobId);
    activeJobIdRef.current = null;

    setState({
      ...initialState,
      phase: "error",
      jobId: event.jobId,
      error: event.message,
    });
  }, []);

  useEffect(() => {
    const unsubscribeProgress = importDesktopService.onBatchProgress((event) => {
      if (event.jobId !== activeJobIdRef.current) {
        return;
      }

      setState((current) => ({
        ...current,
        progress: mapDiscoveryProgressToHookProgress(event),
      }));
    });

    const unsubscribeComplete = importDesktopService.onBatchDiscoveryComplete((event) => {
      void handleDiscoveryComplete(event);
    });

    const unsubscribeError = importDesktopService.onBatchJobError((event) => {
      void handleBatchJobError(event);
    });

    return () => {
      unsubscribeProgress();
      unsubscribeComplete();
      unsubscribeError();
    };
  }, [handleBatchJobError, handleDiscoveryComplete]);

  const startDiscoveryForSelection = useCallback(
    async (
      operationId: number,
      jobId: string,
      sourceType: BatchImportSourceType,
    ): Promise<void> => {
      activeJobIdRef.current = jobId;

      setState({
        ...initialState,
        phase: "discovering",
        isBusy: true,
        jobId,
        sourceType,
      });

      const discoveryResult = await importDesktopService.startBatchDiscovery({
        jobId,
        sourceType,
      });

      if (!isCurrentOperation(operationId)) {
        return;
      }

      if (!discoveryResult.success) {
        await finishBatchJobSafely(jobId);
        activeJobIdRef.current = null;

        setState({
          ...initialState,
          phase: "error",
          jobId,
          sourceType,
          error: discoveryResult.error.message,
        });
      }
    },
    [isCurrentOperation],
  );

  const selectSource = useCallback(
    async (
      sourceType: BatchImportSourceType,
      picker: () => Promise<
        Awaited<
          ReturnType<
            | typeof importDesktopService.selectMultiplePngFiles
            | typeof importDesktopService.selectImportFolder
            | typeof importDesktopService.selectImportZip
          >
        >
      >,
    ) => {
      const operationId = beginOperation();

      setState({
        ...initialState,
        phase: "selecting",
        isBusy: true,
        sourceType,
      });

      const selectionResult = await picker();

      if (!isCurrentOperation(operationId)) {
        return;
      }

      if (!selectionResult.success) {
        setState({
          ...initialState,
          phase: "error",
          sourceType,
          error: selectionResult.error.message,
        });
        return;
      }

      if (selectionResult.data.canceled || !selectionResult.data.jobId) {
        setState(initialState);
        return;
      }

      await startDiscoveryForSelection(
        operationId,
        selectionResult.data.jobId,
        sourceType,
      );
    },
    [beginOperation, isCurrentOperation, startDiscoveryForSelection],
  );

  const selectMultiplePngs = useCallback(async () => {
    await selectSource("multiple-png", () => importDesktopService.selectMultiplePngFiles());
  }, [selectSource]);

  const selectFolder = useCallback(async () => {
    await selectSource("folder", () => importDesktopService.selectImportFolder());
  }, [selectSource]);

  const selectZip = useCallback(async () => {
    await selectSource("zip", () => importDesktopService.selectImportZip());
  }, [selectSource]);

  const uploadBatch = useCallback(async () => {
    const discoveryResult = state.discoveryResult;

    if (!discoveryResult || state.phase !== "ready-to-upload") {
      return;
    }

    if (!user) {
      setState((current) => ({
        ...current,
        error: "You must be signed in to import designs.",
      }));
      return;
    }

    const operationId = beginOperation();
    const cancelToken = new UploadCancelToken();
    uploadCancelTokenRef.current = cancelToken;

    setState((current) => ({
      ...current,
      phase: "uploading",
      isBusy: true,
      error: null,
      uploadReport: null,
    }));

    const runUploadAndCleanup = async (): Promise<void> => {
      try {
        const report = await importBatchOrchestrationService.runBatchUpload({
          caller: user,
          discovery: discoveryResult,
          excludedFilePaths: new Set(state.excludedFilePaths),
          cancelToken,
          onProgress: (progress) => {
            if (!isCurrentOperation(operationId)) {
              return;
            }

            setState((current) => ({
              ...current,
              progress: mapUploadProgressToHookProgress(progress),
            }));
          },
        });

        if (!isCurrentOperation(operationId)) {
          return;
        }

        activeJobIdRef.current = null;

        setState((current) => ({
          ...current,
          phase: "completed",
          isBusy: false,
          uploadReport: report,
          warning: buildUploadWarning(report),
          progress: current.progress
            ? {
                ...current.progress,
                phase: "complete",
                completedCount: report.summary.totalFiles,
                totalCount: report.summary.totalFiles,
                successCount: report.summary.successfulImports,
                failureCount: report.summary.failedImports,
              }
            : null,
        }));
      } catch (error) {
        if (!isCurrentOperation(operationId)) {
          return;
        }

        await finishBatchJobSafely(discoveryResult.jobId);
        activeJobIdRef.current = null;

        const message =
          error instanceof Error
            ? error.message
            : "Unable to complete the batch upload. Please try again.";

        setState((current) => ({
          ...current,
          phase: "error",
          isBusy: false,
          error: message,
        }));
      } finally {
        uploadCancelTokenRef.current = null;
        uploadBatchPromiseRef.current = null;
      }
    };

    const uploadPromise = runUploadAndCleanup();
    uploadBatchPromiseRef.current = uploadPromise;
    await uploadPromise;
  }, [
    beginOperation,
    isCurrentOperation,
    state.discoveryResult,
    state.excludedFilePaths,
    state.phase,
    user,
  ]);

  const toggleFileIncluded = useCallback((filePath: string) => {
    setState((current) => {
      if (current.phase !== "ready-to-upload") {
        return current;
      }

      const excluded = new Set(current.excludedFilePaths);

      if (excluded.has(filePath)) {
        excluded.delete(filePath);
      } else {
        excluded.add(filePath);
      }

      return {
        ...current,
        excludedFilePaths: [...excluded],
      };
    });
  }, []);

  const includeAllValidatedFiles = useCallback(() => {
    setState((current) => {
      if (current.phase !== "ready-to-upload") {
        return current;
      }

      return {
        ...current,
        excludedFilePaths: [],
      };
    });
  }, []);

  const excludeAllValidatedFiles = useCallback(() => {
    setState((current) => {
      if (!current.discoveryResult || current.phase !== "ready-to-upload") {
        return current;
      }

      return {
        ...current,
        excludedFilePaths: getValidatedManifestFiles(current.discoveryResult).map(
          (file) => file.filePath,
        ),
      };
    });
  }, []);

  const cancelImport = useCallback(async () => {
    const jobId = activeJobIdRef.current ?? state.jobId;

    if (state.phase === "uploading") {
      // Cancel the in-flight file's upload and stop any not-yet-started queued files from
      // beginning, then wait for `uploadBatch`'s own try/finally to fully settle (including its
      // `finishBatchJob` call) before resetting UI state — this makes cancelling mid-upload behave
      // identically to cancelling at any other phase instead of leaving the main-process batch
      // session active.
      uploadCancelTokenRef.current?.cancel();
      await uploadBatchPromiseRef.current;
      activeJobIdRef.current = null;
      setState(initialState);
      return;
    }

    beginOperation();

    if (jobId) {
      if (state.phase === "discovering") {
        const cancelResult = await importDesktopService.cancelBatchJob({ jobId });

        if (!cancelResult.success) {
          console.error("cancelBatchJob failed:", cancelResult.error.message);
        }
      }

      await finishBatchJobSafely(jobId);
    }

    activeJobIdRef.current = null;
    setState(initialState);
  }, [beginOperation, state.jobId, state.phase]);

  // A main-process batch session is held open from the moment file selection starts (not just
  // during upload) — see `isBatchSessionActive`. Registering `cancelImport` itself (rather than a
  // narrower upload-only handler) means leaving the app mid-selection/discovery/ready-to-upload
  // via the Sidebar nav guard or the Electron close guard runs the exact same cleanup path as
  // clicking "Cancel Upload" would at that phase, so the session is never orphaned.
  useEffect(() => {
    const isActive = isBatchSessionActive(state.phase);
    setUploadActive(isActive);
    registerCancelHandler(isActive ? cancelImport : null);

    return () => {
      // If the page unmounts anyway (e.g. programmatic navigation outside the guard), never leave
      // a stale "upload active" flag or a cancel handler pointing at an unmounted hook behind.
      setUploadActive(false);
      registerCancelHandler(null);
    };
  }, [state.phase, setUploadActive, registerCancelHandler, cancelImport]);

  const excludedFilePathSet = new Set(state.excludedFilePaths);
  const includedValidatedCount =
    state.discoveryResult === null
      ? 0
      : getValidatedManifestFiles(state.discoveryResult).filter(
          (file) => !excludedFilePathSet.has(file.filePath),
        ).length;

  const canUpload =
    state.phase === "ready-to-upload" &&
    Boolean(state.discoveryResult) &&
    includedValidatedCount > 0 &&
    Boolean(user);

  return {
    ...state,
    canUpload,
    selectMultiplePngs,
    selectFolder,
    selectZip,
    uploadBatch,
    cancelImport,
    reset: cancelImport,
    toggleFileIncluded,
    includeAllValidatedFiles,
    excludeAllValidatedFiles,
  };
}
