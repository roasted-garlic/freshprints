import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { designDocumentSubscriptionService } from "../../designs/services/designDocumentSubscriptionService";
import { permissionService } from "../../permissions/services/permissionService";
import type { Design } from "../../designs/types/design.types";
import { buildAiReviewInboxListQuery } from "../constants/aiReviewInboxConstants";
import { aiEnrichmentEnqueueService } from "../services/aiEnrichmentEnqueueService";
import { aiReviewInboxService } from "../services/aiReviewInboxService";
import type { AiReviewDraftForm, AiReviewInboxFilters } from "../types/aiReviewInbox.types";
import {
  createAiReviewDraftFromDesign,
  isAiReviewDraftDirty,
} from "../utils/aiReviewFormState";
import { designHasAiSuggestions } from "../utils/aiProcessingOutput";
import { sortInboxDesigns } from "../utils/aiReviewInboxSort";
import {
  canEditCatalogInInbox,
  designMatchesInboxTab,
  isDesignApprovableInInbox,
  isDesignRejectableInInbox,
  isDesignReopenableInInbox,
  isDesignRerunnableFromNeedsReview,
  isDesignRerunnableInInbox,
  isDesignRetryableInProcessing,
} from "../utils/aiReviewInboxEligibility";
import { filterDesignsByAiReviewStatus } from "../../designs/utils/designLibrarySearch";
import { useDesigns } from "../../designs/hooks/useDesigns";
import { useAiProcessingQueue } from "./useAiProcessingQueue";
import {
  createNeedsReviewRerunSession,
  shouldCompleteNeedsReviewRerun,
  type NeedsReviewRerunSession,
} from "../utils/aiReviewRerunSession";
import {
  resolveIsPinnedNeedsReviewDesign,
  shouldPrependPinnedDesignToInbox,
  shouldUseLiveDesignForSelection,
} from "../utils/aiReviewInboxSelection";

export interface PendingSelectionChange {
  designId: string | null;
}

export function useAiReviewInbox(
  filters: AiReviewInboxFilters,
  options?: { onQueueChanged?: () => void },
) {
  const { user } = useAuth();
  const listQuery = useMemo(() => buildAiReviewInboxListQuery(filters), [filters]);
  const {
    designs: rawDesigns,
    error,
    hasMore,
    isLoading,
    isLoadingMore,
    loadMoreDesigns,
    reloadDesigns,
  } = useDesigns(listQuery);

  const [selectedDesignId, setSelectedDesignId] = useState<string | null>(null);
  const [liveDesign, setLiveDesign] = useState<Design | null>(null);
  const [isRerunningAi, setIsRerunningAi] = useState(false);
  const [pendingRerun, setPendingRerun] = useState(false);

  const [pendingSelection, setPendingSelection] = useState<PendingSelectionChange | null>(null);
  const queueScrollTopRef = useRef(0);
  const queueListRef = useRef<HTMLDivElement | null>(null);
  const pendingAdvanceIndexRef = useRef<number | null>(null);
  const previousTabRef = useRef(filters.tab);
  const rerunSessionRef = useRef<NeedsReviewRerunSession | null>(null);

  const isPinnedNeedsReviewDesign = resolveIsPinnedNeedsReviewDesign({
    tab: filters.tab,
    selectedDesignId,
    liveDesignId: liveDesign?.id,
    isRerunningAi,
  });

  const designs = useMemo(() => {
    let filtered = rawDesigns.filter((design) => designMatchesInboxTab(design, filters.tab));

    if (filters.tab === "processing") {
      filtered = filterDesignsByAiReviewStatus(filtered, "pending");
    }

    const sorted = sortInboxDesigns(filtered, filters.tab);

    if (
      shouldPrependPinnedDesignToInbox({
        isPinnedNeedsReviewDesign,
        liveDesign,
        sortedDesignIds: sorted.map((design) => design.id),
      })
    ) {
      return [liveDesign!, ...sorted];
    }

    if (!liveDesign || (!designMatchesInboxTab(liveDesign, filters.tab) && !isPinnedNeedsReviewDesign)) {
      return sorted;
    }

    const liveIndex = sorted.findIndex((design) => design.id === liveDesign.id);

    if (liveIndex < 0) {
      return sorted;
    }

    return sorted.map((design, index) => (index === liveIndex ? liveDesign : design));
  }, [filters.tab, isPinnedNeedsReviewDesign, liveDesign, rawDesigns]);

  const [draftForm, setDraftForm] = useState<AiReviewDraftForm | null>(null);
  const [baselineForm, setBaselineForm] = useState<AiReviewDraftForm | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const canManageCatalog = Boolean(user && permissionService.canEditAiReviewInbox(user));
  const canApprove = Boolean(user && permissionService.canApproveDesignForCatalog(user));
  const canReject = Boolean(user && permissionService.canRejectDesignFromCatalog(user));

  const selectedDesign = useMemo(() => {
    if (
      shouldUseLiveDesignForSelection({
        liveDesign,
        selectedDesignId,
        tab: filters.tab,
        isPinnedNeedsReviewDesign,
      })
    ) {
      return liveDesign;
    }

    return designs.find((design) => design.id === selectedDesignId) ?? null;
  }, [designs, filters.tab, isPinnedNeedsReviewDesign, liveDesign, selectedDesignId]);

  const canEditSelected = Boolean(
    canManageCatalog && canEditCatalogInInbox(filters.tab) && selectedDesign,
  );
  const canApproveSelected = Boolean(
    canApprove && selectedDesign && isDesignApprovableInInbox(selectedDesign, filters.tab),
  );
  const canRejectSelected = Boolean(
    canReject && selectedDesign && isDesignRejectableInInbox(selectedDesign, filters.tab),
  );
  const canReopenSelected = Boolean(
    user &&
      permissionService.canReopenRejectedDesign(user) &&
      selectedDesign &&
      isDesignReopenableInInbox(selectedDesign, filters.tab),
  );
  const canRerunSelected = Boolean(
    user &&
      permissionService.canRerunAiSuggestions(user) &&
      selectedDesign &&
      isDesignRerunnableInInbox(selectedDesign, filters.tab),
  );
  const canRetryProcessingSelected = Boolean(
    user && selectedDesign && isDesignRetryableInProcessing(selectedDesign, filters.tab),
  );
  const canRerunAiSuggestions = Boolean(
    user &&
      permissionService.canRerunAiSuggestions(user) &&
      filters.tab === "needs_review" &&
      selectedDesign &&
      !isRerunningAi &&
      isDesignRerunnableFromNeedsReview(selectedDesign),
  );
  const showReadOnlySuggestions = Boolean(
    selectedDesign &&
      (filters.tab === "rejected" ||
        (filters.tab === "processing" && designHasAiSuggestions(selectedDesign))),
  );

  const selectedIndex = useMemo(
    () => (selectedDesignId ? designs.findIndex((design) => design.id === selectedDesignId) : -1),
    [designs, selectedDesignId],
  );

  const isDraftDirty = useMemo(() => {
    if (!draftForm || !baselineForm || !canEditSelected) {
      return false;
    }

    return isAiReviewDraftDirty(baselineForm, draftForm);
  }, [baselineForm, canEditSelected, draftForm]);

  const applySelection = useCallback((design: Design | null) => {
    if (!design) {
      setSelectedDesignId(null);
      setDraftForm(null);
      setBaselineForm(null);
      return;
    }

    const nextDraft = createAiReviewDraftFromDesign(design);
    setSelectedDesignId(design.id);
    setDraftForm(nextDraft);
    setBaselineForm(nextDraft);
    setActionError(null);
  }, []);

  const restoreQueueScroll = useCallback(() => {
    const listElement = queueListRef.current;

    if (listElement) {
      listElement.scrollTop = queueScrollTopRef.current;
    }
  }, []);

  const saveQueueScroll = useCallback(() => {
    const listElement = queueListRef.current;

    if (listElement) {
      queueScrollTopRef.current = listElement.scrollTop;
    }
  }, []);

  const processingQueue = useAiProcessingQueue({
    activeTab: filters.tab,
    designs,
    onActionError: setActionError,
    reloadDesigns,
    requestSelectDesign: (designId) => {
      if (designId === selectedDesignId) {
        return;
      }

      if (designId === null) {
        applySelection(null);
        return;
      }

      const nextDesign = designs.find((design) => design.id === designId) ?? null;
      saveQueueScroll();
      applySelection(nextDesign);
    },
    selectedDesignId,
    selectedIndex,
  });

  useEffect(() => {
    if (import.meta.env.DEV && error) {
      console.warn("[AI Review] inbox query failed", {
        error,
        listQuery,
        tab: filters.tab,
      });
    }
  }, [error, filters.tab, listQuery]);

  useEffect(() => {
    if (!user || !selectedDesignId) {
      setLiveDesign(null);
      return;
    }

    return designDocumentSubscriptionService.subscribeToDesign(
      selectedDesignId,
      (design) => {
        setLiveDesign(design);
      },
      (subscriptionError) => {
        setLiveDesign(null);

        if (import.meta.env.DEV) {
          console.warn("[AI Processing] live design subscription failed", subscriptionError);
        }
      },
    );
  }, [selectedDesignId, user]);

  useEffect(() => {
    if (
      !liveDesign ||
      liveDesign.id !== selectedDesignId ||
      isDraftDirty ||
      !canEditSelected ||
      isRerunningAi
    ) {
      return;
    }

    const nextDraft = createAiReviewDraftFromDesign(liveDesign);
    setDraftForm(nextDraft);
    setBaselineForm(nextDraft);
  }, [canEditSelected, isDraftDirty, isRerunningAi, liveDesign, selectedDesignId]);

  useEffect(() => {
    const session = rerunSessionRef.current;

    if (!isRerunningAi || !session || !liveDesign || liveDesign.id !== selectedDesignId) {
      return;
    }

    if (!shouldCompleteNeedsReviewRerun(liveDesign, session)) {
      return;
    }

    rerunSessionRef.current = null;
    setIsRerunningAi(false);

    const nextDraft = createAiReviewDraftFromDesign(liveDesign);
    setDraftForm(nextDraft);
    setBaselineForm(nextDraft);
    void reloadDesigns();
  }, [isRerunningAi, liveDesign, reloadDesigns, selectedDesignId]);

  useEffect(() => {
    if (!liveDesign || filters.tab !== "processing") {
      return;
    }

    if (liveDesign.aiReviewStatus === "needs_review") {
      void reloadDesigns();
    }
  }, [filters.tab, liveDesign, reloadDesigns]);

  useEffect(() => {
    if (isLoading || pendingAdvanceIndexRef.current === null) {
      return;
    }

    const advanceFromIndex = pendingAdvanceIndexRef.current;
    pendingAdvanceIndexRef.current = null;

    if (designs.length === 0) {
      applySelection(null);
      return;
    }

    const nextIndex = Math.min(Math.max(advanceFromIndex, 0), designs.length - 1);
    applySelection(designs[nextIndex] ?? designs[0] ?? null);
  }, [applySelection, designs, isLoading]);

  useEffect(() => {
    const tabChanged = previousTabRef.current !== filters.tab;
    previousTabRef.current = filters.tab;

    if (!tabChanged || isLoading || pendingAdvanceIndexRef.current !== null) {
      return;
    }

    if (isRerunningAi && filters.tab === "needs_review") {
      return;
    }

    if (designs.length === 0) {
      applySelection(null);
      return;
    }

    applySelection(designs[0] ?? null);
  }, [applySelection, designs, filters.tab, isLoading, isRerunningAi]);

  useEffect(() => {
    if (pendingAdvanceIndexRef.current !== null || isLoading) {
      return;
    }

    if (isRerunningAi && filters.tab === "needs_review") {
      return;
    }

    if (designs.length === 0) {
      applySelection(null);
      return;
    }

    if (!selectedDesignId || !designs.some((design) => design.id === selectedDesignId)) {
      applySelection(designs[0] ?? null);
    }
  }, [applySelection, designs, filters.tab, isLoading, isRerunningAi, selectedDesignId]);

  useEffect(() => {
    requestAnimationFrame(() => {
      restoreQueueScroll();
    });
  }, [selectedDesignId, restoreQueueScroll]);

  const requestSelectDesign = useCallback(
    (designId: string | null) => {
      if (designId === selectedDesignId) {
        return;
      }

      if (isDraftDirty) {
        setPendingSelection({ designId });
        return;
      }

      saveQueueScroll();
      const nextDesign = designId ? designs.find((design) => design.id === designId) ?? null : null;
      applySelection(nextDesign);
    },
    [applySelection, designs, isDraftDirty, saveQueueScroll, selectedDesignId],
  );

  const confirmDiscardPendingSelection = useCallback(() => {
    if (!pendingSelection) {
      return;
    }

    saveQueueScroll();
    const nextDesign = pendingSelection.designId
      ? designs.find((design) => design.id === pendingSelection.designId) ?? null
      : null;
    applySelection(nextDesign);
    setPendingSelection(null);
  }, [applySelection, designs, pendingSelection, saveQueueScroll]);

  const cancelPendingSelection = useCallback(() => {
    setPendingSelection(null);
    setPendingRerun(false);
  }, []);

  const executeRerunAiSuggestions = useCallback(async () => {
    if (
      !user ||
      !selectedDesign ||
      filters.tab !== "needs_review" ||
      isRerunningAi ||
      !isDesignRerunnableFromNeedsReview(selectedDesign)
    ) {
      return;
    }

    rerunSessionRef.current = createNeedsReviewRerunSession(selectedDesign);
    setIsRerunningAi(true);
    setActionError(null);

    try {
      const result = await aiEnrichmentEnqueueService.rerunFromReview(selectedDesign.id);

      if (!result.queued) {
        throw new Error(result.reason ?? "AI re-run could not be queued.");
      }
    } catch (rerunError) {
      rerunSessionRef.current = null;
      setIsRerunningAi(false);
      setActionError(
        rerunError instanceof Error ? rerunError.message : "Unable to re-run AI suggestions.",
      );
    }
  }, [filters.tab, isRerunningAi, selectedDesign, user]);

  const confirmPendingRerun = useCallback(() => {
    setPendingRerun(false);
    void executeRerunAiSuggestions();
  }, [executeRerunAiSuggestions]);

  const requestRerunAiSuggestions = useCallback(() => {
    if (!canRerunAiSuggestions) {
      return;
    }

    if (isDraftDirty) {
      setPendingRerun(true);
      return;
    }

    void executeRerunAiSuggestions();
  }, [canRerunAiSuggestions, executeRerunAiSuggestions, isDraftDirty]);

  const selectRelative = useCallback(
    (offset: number) => {
      if (selectedIndex < 0 || designs.length === 0) {
        return;
      }

      const nextIndex = Math.min(Math.max(selectedIndex + offset, 0), designs.length - 1);
      const nextDesign = designs[nextIndex];

      if (nextDesign) {
        requestSelectDesign(nextDesign.id);
      }
    },
    [designs, requestSelectDesign, selectedIndex],
  );

  const updateDraftField = useCallback(
    (field: keyof AiReviewDraftForm, value: string) => {
      if (!canEditSelected) {
        return;
      }

      setDraftForm((currentDraft) => {
        if (!currentDraft) {
          return currentDraft;
        }

        return {
          ...currentDraft,
          [field]: value,
        };
      });
    },
    [canEditSelected],
  );

  const runInboxAction = useCallback(
    async (action: () => Promise<void>) => {
      if (!user) {
        return;
      }

      setIsActionLoading(true);
      setActionError(null);

      try {
        await action();
        setLiveDesign(null);
        pendingAdvanceIndexRef.current = selectedIndex;
        await reloadDesigns();
        options?.onQueueChanged?.();
      } catch (inboxError) {
        pendingAdvanceIndexRef.current = null;
        setActionError(
          inboxError instanceof Error ? inboxError.message : "Unable to complete the action.",
        );
      } finally {
        setIsActionLoading(false);
      }
    },
    [options, reloadDesigns, selectedIndex, user],
  );

  const approveSelected = useCallback(async () => {
    if (!user || !selectedDesign || !draftForm || !canApproveSelected) {
      return;
    }

    await runInboxAction(async () => {
      await aiReviewInboxService.approveFromInbox(user, selectedDesign.id, draftForm);
    });
  }, [canApproveSelected, draftForm, runInboxAction, selectedDesign, user]);

  const rejectSelected = useCallback(async () => {
    if (!user || !selectedDesign || !canRejectSelected) {
      return;
    }

    await runInboxAction(async () => {
      await aiReviewInboxService.rejectFromInbox(user, selectedDesign.id);
    });
  }, [canRejectSelected, runInboxAction, selectedDesign, user]);

  const reopenSelected = useCallback(async () => {
    if (!user || !selectedDesign || !canReopenSelected) {
      return;
    }

    await runInboxAction(async () => {
      await aiReviewInboxService.reopenFromInbox(user, selectedDesign.id);
    });
  }, [canReopenSelected, runInboxAction, selectedDesign, user]);

  const rerunSelected = useCallback(async () => {
    if (!user || !selectedDesign || !canRerunSelected) {
      return;
    }

    await runInboxAction(async () => {
      await aiReviewInboxService.rerunAiFromInbox(user, selectedDesign.id);
    });
  }, [canRerunSelected, runInboxAction, selectedDesign, user]);

  const retryProcessingSelected = useCallback(async () => {
    if (!user || !selectedDesign || !canRetryProcessingSelected) {
      return;
    }

    setIsActionLoading(true);
    setActionError(null);

    try {
      const result = await aiEnrichmentEnqueueService.retryFailedProcessing(selectedDesign.id);

      if (!result.queued) {
        throw new Error("AI processing could not be queued. Please try again.");
      }

      setLiveDesign(null);
      await reloadDesigns();
      options?.onQueueChanged?.();
    } catch (retryError) {
      setActionError(
        retryError instanceof Error ? retryError.message : "Unable to retry AI processing.",
      );
    } finally {
      setIsActionLoading(false);
    }
  }, [canRetryProcessingSelected, options, reloadDesigns, selectedDesign, user]);

  return {
    actionError,
    baselineForm,
    canApprove: canApproveSelected,
    canEdit: canEditSelected,
    canReject: canRejectSelected,
    canReopen: canReopenSelected,
    canRerun: canRerunSelected,
    canRetryProcessing: canRetryProcessingSelected,
    canRerunAiSuggestions,
    showReadOnlySuggestions,
    activeTab: filters.tab,
    cancelPendingSelection,
    confirmDiscardPendingSelection,
    confirmPendingRerun,
    designs,
    draftForm,
    error,
    filters,
    hasMore,
    isActionLoading,
    isDraftDirty,
    isLoading,
    isLoadingMore,
    isRerunningAi,
    listQuery,
    loadMoreDesigns,
    pendingSelection,
    pendingRerun,
    queueListRef,
    reloadDesigns,
    requestSelectDesign,
    selectedDesign,
    selectedIndex,
    selectRelative,
    approveSelected,
    rejectSelected,
    reopenSelected,
    rerunSelected,
    requestRerunAiSuggestions,
    retryProcessingSelected,
    updateDraftField,
    processingQueue,
  };
}
