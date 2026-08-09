import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { Design } from "../../designs/types/design.types";
import { useUploadActivity } from "../../../shared/hooks/useUploadActivity";
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

const aiProcessingDialogCopy = {
  closeCancelLabel: "Stay and continue",
  closeConfirmLabel: "Quit and stop queue",
  closeCopy:
    "AI is currently processing. Quitting Fresh Prints Studio will stop the queue from starting another image, but the in-flight image may still finish.",
  closeTitle: "Quit and stop AI queue?",
  leaveCancelLabel: "Stay and continue",
  leaveConfirmLabel: "Leave and stop queue",
  leaveCopy:
    "AI is currently processing. Leaving this page will stop the queue from starting another image, but the in-flight image may still finish.",
  leaveTitle: "Leave and stop AI queue?",
};

interface UseAiProcessingQueueOptions {
  activeTab: AiReviewInboxTab;
  applyDesignPatch: (designId: string, patch: Partial<Design>) => void;
  defaultVisionModelId: string;
  designs: Design[];
  /**
   * True when a terminal AI patch already recorded this design as having left pending in the
   * current Processing run — used to skip redundant post-patch list reloads (Approach C).
   */
  hasTerminalAiProcessingLedgerEntry: (designId: string) => boolean;
  onActionError: (message: string | null) => void;
  /**
   * Called after a design finishes processing (manual single-image "Process" or the auto-advance
   * queue), so Processing/Needs Review tab counts reconcile immediately — previously only the
   * rerun-from-inbox path (executeRerunToProcessing) triggered a count reload; the manual/
   * auto-queue paths never did (post-launch-catalog-and-processing-stability, Owner QA
   * Amendment 1, Workstream 2).
   */
  onQueueChanged?: () => void;
  reloadDesigns: () => Promise<void>;
  requestSelectDesign: (designId: string | null) => void;
  selectedDesignId: string | null;
  selectedIndex: number;
}

export function useAiProcessingQueue({
  activeTab,
  applyDesignPatch,
  defaultVisionModelId,
  designs,
  hasTerminalAiProcessingLedgerEntry,
  onActionError,
  onQueueChanged,
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
  const { registerCancelHandler, setActivityDialogCopy, setUploadActive } = useUploadActivity();

  const designsRef = useRef(designs);
  const isMountedRef = useRef(true);
  const runStateRef = useRef(runState);
  const stopRequestedRef = useRef(false);
  const selectedIndexRef = useRef(selectedIndex);
  /**
   * True only while runAutoQueueLoop's body is actually executing (set/cleared with the same
   * try/finally shape as isQueueBusy, independent of the runState label). runState can be left at
   * "pausing" if the loop never gets a chance to observe stopRequestedRef and settle itself back
   * to "idle" (e.g. the page unmounted mid-await before the in-flight enqueueDesign resolved) —
   * this ref lets stopAiProcessingForNavigation tell a genuinely-still-running loop apart from a
   * stale "pausing" label left over from an earlier interrupted session, so it can safely
   * reconcile the stale case without racing the real one.
   */
  const isAutoQueueLoopRunningRef = useRef(false);

  useEffect(() => {
    // Set true on (re)mount, not just via the initial useRef value: React 18 StrictMode runs
    // setup → cleanup → setup on the first mount in dev, so without re-arming here the cleanup's
    // `= false` would leave the ref permanently false for the component's whole life — which made
    // the auto-advance loop bail at `if (!isMountedRef.current) return` right after the first
    // design, so it processed exactly one image and stopped.
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    designsRef.current = designs;
  }, [designs]);

  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
  }, [selectedIndex]);

  const setAutoAdvance = useCallback((enabled: boolean) => {
    setAutoAdvanceState(enabled);
    writeAiProcessingAutoAdvancePreference(enabled);
  }, []);

  const awaitingDesigns = useMemo(
    () =>
      activeTab === "processing"
        ? designs.filter(
            (design) => isDesignAwaitingAiStart(design) || design.id === enqueueingDesignId,
          )
        : [],
    [activeTab, designs, enqueueingDesignId],
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

    const isCurrentlyEnqueueing = selectedDesign.id === enqueueingDesignId;

    if (
      !isDesignAwaitingAiStart(selectedDesign) &&
      !isDesignAiProcessingFailed(selectedDesign) &&
      !isCurrentlyEnqueueing
    ) {
      return null;
    }

    const position = awaitingDesigns.findIndex((design) => design.id === selectedDesign.id);

    if (position < 0) {
      return null;
    }

    return `${position + 1} of ${awaitingDesigns.length} waiting`;
  }, [activeTab, awaitingDesigns, enqueueingDesignId, selectedDesign]);

  const resolvedSessionVisionModelId = sessionVisionModelId ?? defaultVisionModelId;

  const hasSessionOverride = Boolean(sessionVisionModelId);

  const applySessionSettings = useCallback((visionModelId: string) => {
    setSessionVisionModelId(visionModelId);
  }, []);

  const clearSessionSettings = useCallback(() => {
    setSessionVisionModelId(null);
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
      settings: { visionModelId: string },
    ) => {
      setEnqueueingDesignId(designId);

      try {
        const result = await aiEnrichmentEnqueueService.enqueueForProcessing(designId, {
          visionModelIdOverride: settings.visionModelId,
        });

        if (!isMountedRef.current) {
          return;
        }

        if (!result.queued && result.reason !== "already_terminal") {
          setEnqueueingDesignId(null);
          throw new Error(
            result.reason === "already_processing"
              ? "This design is already being processed."
              : "AI processing could not be queued. Please try again.",
          );
        }

        // The callable either ran the pipeline synchronously and returned the terminal AI
        // state (queued + completed), or found the design had already reached that terminal
        // state from an earlier call (reason: "already_terminal") — both carry the design's
        // real current fields. Apply the patch immediately so Processing/Needs Review bucket
        // membership and counts reconcile without waiting on the background Firestore reload
        // below, and without this benign duplicate-call outcome ever surfacing as an error
        // (post-launch-catalog-and-processing-stability, Workstream D).
        const patch = buildDesignPatchFromEnqueueResult(result);

        if (patch) {
          applyDesignPatch(designId, patch);
        }

        // Clear the optimistic flag now that the call has genuinely finished, rather than
        // waiting for a design's aiProcessingStage to change (see the removed effect this
        // replaced — a design carrying a leftover aiProcessingStage from a prior run made that
        // approach false-positive on the very next enqueue, clearing the optimistic "Processing…"
        // display before this call had actually completed and leaving the UI showing stale idle
        // copy for the remaining duration of a real, still-in-flight request).
        setEnqueueingDesignId(null);
      } catch (error) {
        if (isMountedRef.current) {
          setEnqueueingDesignId(null);
        }
        throw error;
      }
    },
    [applyDesignPatch],
  );

  const refreshDesignList = useCallback(
    async (refreshOptions?: { skipListReload?: boolean }) => {
      // After a successful terminal patch, list replace is redundant and hostile: a 15s page-cache
      // hit or lagging pending query can reinsert the completed design. Counts still refresh via
      // onQueueChanged; monotonic merge remains the safety net for any remaining reload path.
      if (!refreshOptions?.skipListReload) {
        await reloadDesigns();
      }

      // Reconcile Processing/Needs Review counts alongside the design list itself — previously only
      // the rerun-from-inbox path did this; the manual "Process" and auto-advance-queue paths never
      // called anything reaching useAiReviewTabCounts.reloadCounts(), leaving the count stale after
      // every successful completion through this hook (post-launch-catalog-and-processing-stability,
      // Owner QA Amendment 1, Workstream 2).
      onQueueChanged?.();

      // Brief settle delay before the caller reads designsRef/advances selection, so the
      // just-applied optimistic patch has a couple of frames to render before layout shifts again.
      // Uses a bounded timeout rather than requestAnimationFrame: rAF callbacks are throttled or
      // fully suspended by Chromium/Electron whenever the window is minimized or loses visibility,
      // which could hang this await indefinitely and strand isQueueBusy at true for the rest of the
      // component's life (nothing else resets it). A timeout always fires regardless of window
      // visibility, so this can never hang the caller's finally block.
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 32);
      });
    },
    [onQueueChanged, reloadDesigns],
  );

  const runAutoQueueLoop = useCallback(
    async (
      startIndex: number,
      settingsSnapshot: { visionModelId: string },
    ) => {
      setIsQueueBusy(true);
      isAutoQueueLoopRunningRef.current = true;
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
            // Nothing left to select in this now-shrunk list — clear rather than leave
            // selectedDesignId dangling on a design that may no longer exist here (see the
            // nextAwaitingIndex < 0 branch below for the fuller explanation).
            requestSelectDesign(null);
            break;
          }

          const nextAwaitingIndex = findNextAwaitingIndex(currentDesigns, index);

          if (nextAwaitingIndex < 0) {
            // No design remains awaiting AI start. If the previously-selected design (from the
            // prior loop iteration) just left this filtered list — e.g. it was the last design
            // awaiting and just completed — selectedDesignId would otherwise keep pointing at an
            // ID no longer present in `designs`, permanently collapsing this hook's own
            // selectedDesign derivation to null and disabling "Start AI" until an unrelated route
            // remount re-selects a valid design (post-launch-catalog-and-processing-stability,
            // Owner QA Amendment 1, Workstream 2).
            requestSelectDesign(null);
            break;
          }

          index = nextAwaitingIndex;
          const design = currentDesigns[index];

          if (!design) {
            break;
          }

          requestSelectDesign(design.id);
          await enqueueDesign(design.id, settingsSnapshot);

          if (!isMountedRef.current) {
            return;
          }

          await refreshDesignList({
            skipListReload: hasTerminalAiProcessingLedgerEntry(design.id),
          });

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
        if (isMountedRef.current) {
          setEnqueueingDesignId(null);
          onActionError(
            queueError instanceof Error
              ? queueError.message
              : "Unable to run the AI processing queue.",
          );
        }
        runStateRef.current = "idle";
        if (isMountedRef.current) {
          setRunState("idle");
        }
      } finally {
        isAutoQueueLoopRunningRef.current = false;

        // Always clear isQueueBusy — see the matching comment in processSelectedDesign's finally
        // block for why the isMountedRef guard here was unsafe (it could permanently strand
        // isQueueBusy at true if the loop's in-flight work outlives an unmount that didn't
        // actually reset this hook instance).
        setIsQueueBusy(false);
      }
    },
    [
      advanceSelectionToIndex,
      enqueueDesign,
      hasTerminalAiProcessingLedgerEntry,
      onActionError,
      refreshDesignList,
      requestSelectDesign,
    ],
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
    });
  }, [
    canStartAutoQueue,
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

  const stopAiProcessingForNavigation = useCallback(async () => {
    stopRequestedRef.current = true;

    if (runStateRef.current === "running") {
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
      });

      if (!isMountedRef.current) {
        return;
      }

      await refreshDesignList({
        skipListReload: hasTerminalAiProcessingLedgerEntry(selectedDesignId),
      });

      const refreshedDesigns = designsRef.current;
      const refreshedDesign = refreshedDesigns.find((item) => item.id === selectedDesignId);
      const failed = refreshedDesign ? isDesignAiProcessingFailed(refreshedDesign) : false;
      const nextIndex = resolveAdvanceIndexAfterProcessing(refreshedDesigns, processedIndex, failed);

      if (nextIndex >= 0) {
        advanceSelectionToIndex(nextIndex);
      } else {
        // The just-processed design left the Processing tab (successful completion moves
        // aiReviewStatus off "pending", filtering it out of `designs`) and no other design is
        // awaiting AI start. selectedDesignId must not keep pointing at that now-absent ID — this
        // hook's own selectedDesign derivation (designs.find(...)) would otherwise permanently
        // collapse to null, disabling "Start AI" until an unrelated route remount re-selects a
        // valid design (post-launch-catalog-and-processing-stability, Owner QA Amendment 1,
        // Workstream 2).
        requestSelectDesign(null);
      }
    } catch (processError) {
      if (isMountedRef.current) {
        setEnqueueingDesignId(null);
        onActionError(
          processError instanceof Error
            ? processError.message
            : "Unable to process this design with AI.",
        );
      }
    } finally {
      // Always clear isQueueBusy, even if the component unmounted mid-run (e.g. the user
      // navigated away and confirmed the nav guard while this one-off run was still in flight).
      // Calling a state setter after unmount is a harmless no-op in React — but skipping it here
      // (as the isMountedRef guard used to) would strand isQueueBusy at true for the remaining
      // life of the component if it never actually unmounts (e.g. the nav guard's "Leave and stop
      // queue" was confirmed but navigation didn't actually unmount this instance), permanently
      // disabling the "Process image with AI" button and tripping the nav guard on every future
      // one-off run in the session.
      setIsQueueBusy(false);
    }
  }, [
    advanceSelectionToIndex,
    canProcessSelected,
    enqueueDesign,
    hasTerminalAiProcessingLedgerEntry,
    onActionError,
    refreshDesignList,
    requestSelectDesign,
    resolvedSessionVisionModelId,
    selectedDesignId,
  ]);

  // Self-correcting watchdog for a stuck "pausing" state. runState is normally settled back to
  // "idle" by runAutoQueueLoop itself once it observes stopRequestedRef after its in-flight
  // enqueueDesign call resolves — but if the loop never gets that chance (page unmounted mid-await
  // before the in-flight call settled), runState can be left at "pausing" indefinitely, which
  // would otherwise trip the nav guard for every future one-off run in the session even though
  // nothing is running. isAutoQueueLoopRunningRef tracks whether the loop body is *actually* still
  // executing, independent of the runState label, so this can distinguish "genuinely mid-pause,
  // give the loop a moment to finish" from "stale label, no loop is running, force idle" without
  // racing the loop's own legitimate transitions (a short delay gives an in-flight loop the window
  // it needs to settle itself first; this only fires if that never happens).
  useEffect(() => {
    if (runState !== "pausing") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (runStateRef.current === "pausing" && !isAutoQueueLoopRunningRef.current) {
        runStateRef.current = "idle";
        setRunState("idle");
      }
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [runState]);

  useEffect(() => {
    const isAiProcessingActive = isQueueBusy || runState === "running" || runState === "pausing";

    setUploadActive(isAiProcessingActive);
    registerCancelHandler(isAiProcessingActive ? stopAiProcessingForNavigation : null);
    setActivityDialogCopy(isAiProcessingActive ? aiProcessingDialogCopy : null);

    return () => {
      setUploadActive(false);
      registerCancelHandler(null);
      setActivityDialogCopy(null);
    };
  }, [
    isQueueBusy,
    registerCancelHandler,
    runState,
    setActivityDialogCopy,
    setUploadActive,
    stopAiProcessingForNavigation,
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
    resolvedSessionVisionModelId,
    runState,
    setAutoAdvance,
    startAutoQueue,
    stopAutoQueue,
  };
}
