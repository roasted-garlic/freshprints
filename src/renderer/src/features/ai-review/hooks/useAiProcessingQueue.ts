import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { Design } from "../../designs/types/design.types";
import { aiEnrichmentEnqueueService } from "../services/aiEnrichmentEnqueueService";
import { buildDesignPatchFromEnqueueResult } from "../utils/enqueueResultPatch";
import type { AiReviewInboxTab } from "../types/aiReviewInbox.types";
import {
  isDesignAiProcessingFailed,
  isDesignAwaitingAiStart,
} from "../utils/aiProcessingQueueEligibility";
import {
  findNextAwaitingIndex,
  resolveAdvanceIndexAfterProcessing,
  shouldAutoQueueContinue,
} from "../utils/aiProcessingQueueSelection";
import {
  readAiProcessingAutoAdvancePreference,
  writeAiProcessingAutoAdvancePreference,
} from "../utils/aiProcessingQueuePreferences";

import type { AiProcessingQueueRunState } from "../types/aiProcessingQueue.types";

export type { AiProcessingQueueRunState } from "../types/aiProcessingQueue.types";

interface UseAiProcessingQueueOptions {
  activeTab: AiReviewInboxTab;
  applyDesignPatch: (designId: string, patch: Partial<Design>) => void;
  defaultReasoningEffort: string;
  defaultVisionModelId: string;
  designs: Design[];
  onActionError: (message: string | null) => void;
  reloadDesigns: () => Promise<void>;
  requestSelectDesign: (designId: string | null) => void;
  selectedDesignId: string | null;
  selectedIndex: number;
}

export function useAiProcessingQueue({
  activeTab,
  applyDesignPatch,
  defaultReasoningEffort,
  defaultVisionModelId,
  designs,
  onActionError,
  reloadDesigns,
  requestSelectDesign,
  selectedDesignId,
  selectedIndex,
}: UseAiProcessingQueueOptions) {
  const [autoAdvance, setAutoAdvanceState] = useState(readAiProcessingAutoAdvancePreference);
  const [runState, setRunState] = useState<AiProcessingQueueRunState>("idle");
  const [isQueueBusy, setIsQueueBusy] = useState(false);
  const [enqueueingDesignId, setEnqueueingDesignId] = useState<string | null>(null);
  const [sessionVisionModelId, setSessionVisionModelId] = useState<string | null>(null);
  const [sessionReasoningEffort, setSessionReasoningEffort] = useState<string | null>(null);

  const designsRef = useRef(designs);
  const runStateRef = useRef(runState);
  const stopRequestedRef = useRef(false);
  const selectedIndexRef = useRef(selectedIndex);

  useEffect(() => {
    designsRef.current = designs;
  }, [designs]);

  useEffect(() => {
    runStateRef.current = runState;
  }, [runState]);

  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
  }, [selectedIndex]);

  useEffect(() => {
    if (!enqueueingDesignId) {
      return;
    }

    const design = designs.find((item) => item.id === enqueueingDesignId);

    if (!design?.aiProcessingStage) {
      return;
    }

    setEnqueueingDesignId(null);
  }, [designs, enqueueingDesignId]);

  const setAutoAdvance = useCallback((enabled: boolean) => {
    setAutoAdvanceState(enabled);
    writeAiProcessingAutoAdvancePreference(enabled);
  }, []);

  const awaitingDesigns = useMemo(
    () => (activeTab === "processing" ? designs.filter(isDesignAwaitingAiStart) : []),
    [activeTab, designs],
  );

  const selectedDesign = useMemo(
    () => designs.find((design) => design.id === selectedDesignId) ?? null,
    [designs, selectedDesignId],
  );

  const canProcessSelected = Boolean(
    activeTab === "processing" &&
      selectedDesign &&
      isDesignAwaitingAiStart(selectedDesign) &&
      runState === "idle" &&
      !isQueueBusy,
  );

  const canStartAutoQueue = Boolean(
    activeTab === "processing" &&
      autoAdvance &&
      runState === "idle" &&
      !isQueueBusy &&
      awaitingDesigns.length > 0,
  );

  const canStopAutoQueue = activeTab === "processing" && runState === "running";

  const isAutoQueueRunning =
    activeTab === "processing" && autoAdvance && (runState === "running" || runState === "pausing");

  const queuePositionLabel = useMemo(() => {
    if (activeTab !== "processing" || awaitingDesigns.length === 0 || !selectedDesign) {
      return null;
    }

    if (!isDesignAwaitingAiStart(selectedDesign) && !isDesignAiProcessingFailed(selectedDesign)) {
      return null;
    }

    const position = awaitingDesigns.findIndex((design) => design.id === selectedDesign.id);

    if (position < 0) {
      return null;
    }

    return `${position + 1} of ${awaitingDesigns.length} waiting`;
  }, [activeTab, awaitingDesigns, selectedDesign]);

  const resolvedSessionVisionModelId = sessionVisionModelId ?? defaultVisionModelId;
  const resolvedSessionReasoningEffort = sessionReasoningEffort ?? defaultReasoningEffort;

  const hasSessionOverride = Boolean(sessionVisionModelId || sessionReasoningEffort);

  const applySessionSettings = useCallback((visionModelId: string, reasoningEffort: string) => {
    setSessionVisionModelId(visionModelId);
    setSessionReasoningEffort(reasoningEffort);
  }, []);

  const clearSessionSettings = useCallback(() => {
    setSessionVisionModelId(null);
    setSessionReasoningEffort(null);
  }, []);

  const advanceSelectionToIndex = useCallback(
    (index: number) => {
      const nextDesign = designsRef.current[index];

      if (nextDesign) {
        requestSelectDesign(nextDesign.id);
      }
    },
    [requestSelectDesign],
  );

  const enqueueDesign = useCallback(
    async (
      designId: string,
      settings: { visionModelId: string; reasoningEffort: string },
    ) => {
      setEnqueueingDesignId(designId);

      try {
        const result = await aiEnrichmentEnqueueService.enqueueForProcessing(designId, {
          visionModelIdOverride: settings.visionModelId,
          reasoningEffortOverride: settings.reasoningEffort,
        });

        if (!result.queued) {
          setEnqueueingDesignId(null);
          throw new Error(
            result.reason === "already_processing"
              ? "This design is already being processed."
              : "AI processing could not be queued. Please try again.",
          );
        }

        // The callable runs the pipeline synchronously and returns the terminal AI state.
        // Apply it immediately so the UI reflects completion without waiting on the
        // background Firestore reload below.
        const patch = buildDesignPatchFromEnqueueResult(result);

        if (patch) {
          applyDesignPatch(designId, patch);
        }
      } catch (error) {
        setEnqueueingDesignId(null);
        throw error;
      }
    },
    [applyDesignPatch],
  );

  const refreshDesignList = useCallback(async () => {
    await reloadDesigns();
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });
  }, [reloadDesigns]);

  const runAutoQueueLoop = useCallback(
    async (
      startIndex: number,
      settingsSnapshot: { visionModelId: string; reasoningEffort: string },
    ) => {
      setIsQueueBusy(true);
      onActionError(null);
      setRunState("running");
      runStateRef.current = "running";
      stopRequestedRef.current = false;

      try {
        let index = Math.max(0, startIndex);

        while (shouldAutoQueueContinue(runStateRef.current)) {
          if (stopRequestedRef.current) {
            stopRequestedRef.current = false;
            runStateRef.current = "idle";
            setRunState("idle");
            return;
          }

          const currentDesigns = designsRef.current;

          if (index >= currentDesigns.length) {
            break;
          }

          const nextAwaitingIndex = findNextAwaitingIndex(currentDesigns, index);

          if (nextAwaitingIndex < 0) {
            break;
          }

          index = nextAwaitingIndex;
          const design = currentDesigns[index];

          if (!design) {
            break;
          }

          requestSelectDesign(design.id);
          await enqueueDesign(design.id, settingsSnapshot);
          await refreshDesignList();

          const refreshedDesigns = designsRef.current;
          const refreshedDesign = refreshedDesigns.find((item) => item.id === design.id);
          const failed = refreshedDesign ? isDesignAiProcessingFailed(refreshedDesign) : false;

          if (stopRequestedRef.current) {
            const nextIndex = resolveAdvanceIndexAfterProcessing(refreshedDesigns, index, failed);
            if (nextIndex >= 0) {
              advanceSelectionToIndex(nextIndex);
            }
            stopRequestedRef.current = false;
            runStateRef.current = "idle";
            setRunState("idle");
            return;
          }

          if (failed) {
            index += 1;
          }
        }

        runStateRef.current = "idle";
        setRunState("idle");
      } catch (queueError) {
        setEnqueueingDesignId(null);
        onActionError(
          queueError instanceof Error ? queueError.message : "Unable to run the AI processing queue.",
        );
        runStateRef.current = "idle";
        setRunState("idle");
      } finally {
        setIsQueueBusy(false);
      }
    },
    [advanceSelectionToIndex, enqueueDesign, onActionError, refreshDesignList, requestSelectDesign],
  );

  const startAutoQueue = useCallback(() => {
    if (!canStartAutoQueue) {
      return;
    }

    const startIndex =
      selectedDesign && isDesignAwaitingAiStart(selectedDesign)
        ? selectedIndexRef.current
        : findNextAwaitingIndex(designsRef.current, 0);

    if (startIndex < 0) {
      return;
    }

    void runAutoQueueLoop(startIndex, {
      visionModelId: resolvedSessionVisionModelId,
      reasoningEffort: resolvedSessionReasoningEffort,
    });
  }, [
    canStartAutoQueue,
    resolvedSessionReasoningEffort,
    resolvedSessionVisionModelId,
    runAutoQueueLoop,
    selectedDesign,
  ]);

  const stopAutoQueue = useCallback(() => {
    if (runStateRef.current === "running") {
      stopRequestedRef.current = true;
      runStateRef.current = "pausing";
      setRunState("pausing");
    }
  }, []);

  const processSelectedDesign = useCallback(async () => {
    if (!canProcessSelected || !selectedDesignId) {
      return;
    }

    const processedIndex = selectedIndexRef.current;

    setIsQueueBusy(true);
    onActionError(null);

    try {
      await enqueueDesign(selectedDesignId, {
        visionModelId: resolvedSessionVisionModelId,
        reasoningEffort: resolvedSessionReasoningEffort,
      });
      await refreshDesignList();

      const refreshedDesigns = designsRef.current;
      const refreshedDesign = refreshedDesigns.find((item) => item.id === selectedDesignId);
      const failed = refreshedDesign ? isDesignAiProcessingFailed(refreshedDesign) : false;
      const nextIndex = resolveAdvanceIndexAfterProcessing(refreshedDesigns, processedIndex, failed);

      if (nextIndex >= 0) {
        advanceSelectionToIndex(nextIndex);
      }
    } catch (processError) {
      setEnqueueingDesignId(null);
      onActionError(
        processError instanceof Error ? processError.message : "Unable to process this design with AI.",
      );
    } finally {
      setIsQueueBusy(false);
    }
  }, [
    advanceSelectionToIndex,
    canProcessSelected,
    enqueueDesign,
    onActionError,
    refreshDesignList,
    resolvedSessionReasoningEffort,
    resolvedSessionVisionModelId,
    selectedDesignId,
  ]);

  return {
    autoAdvance,
    applySessionSettings,
    canProcessSelected,
    canStartAutoQueue,
    canStopAutoQueue,
    clearSessionSettings,
    enqueueingDesignId,
    hasSessionOverride,
    isAutoQueueRunning,
    isQueueBusy,
    processSelectedDesign,
    queuePositionLabel,
    resolvedSessionReasoningEffort,
    resolvedSessionVisionModelId,
    runState,
    setAutoAdvance,
    startAutoQueue,
    stopAutoQueue,
  };
}
