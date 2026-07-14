import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { designDocumentSubscriptionService } from "../../designs/services/designDocumentSubscriptionService";
import { useCatalogTags } from "../../designs/hooks/useCatalogTags";
import type { CreateCatalogTagInput } from "../../designs/types/catalogTag.types";
import { permissionService } from "../../permissions/services/permissionService";
import type { Design } from "../../designs/types/design.types";
import { buildAiReviewInboxListQuery } from "../constants/aiReviewInboxConstants";
import { aiEnrichmentEnqueueService } from "../services/aiEnrichmentEnqueueService";
import { aiReviewInboxService } from "../services/aiReviewInboxService";
import { buildDesignPatchFromEnqueueResult } from "../utils/enqueueResultPatch";
import type { AiReviewDraftForm, AiReviewInboxFilters, AiReviewInboxTab } from "../types/aiReviewInbox.types";
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
  addApprovedSuggestedTagToDraftTags,
  normalizeSuggestedTagKey,
} from "../utils/suggestedNewTags";
import {
  resolveIsPinnedNeedsReviewDesign,
  resolvePendingCrossTabDesign,
  resolveRejectedReopenTargetTab,
  resolveRejectedRerunTargetTab,
  resolveFreshestInboxDesign,
  shouldPrependPinnedDesignToInbox,
  shouldRetainCrossTabSelection,
  shouldSuppressDefaultInboxSelection,
  shouldUseLiveDesignForSelection,
  type PendingCrossTabSelection,
} from "../utils/aiReviewInboxSelection";

export interface UseAiReviewInboxOptions {
  defaultVisionModelId: string;
  onNavigateToTab?: (tab: AiReviewInboxTab, designId: string) => void;
  onQueueChanged?: () => void;
}

export interface PendingSelectionChange {
  designId: string | null;
}

export function useAiReviewInbox(
  filters: AiReviewInboxFilters,
  options?: UseAiReviewInboxOptions,
) {
  const { user } = useAuth();
  const listQuery = useMemo(() => buildAiReviewInboxListQuery(filters), [filters]);
  const {
    applyDesignPatch,
    designs: rawDesigns,
    error,
    hasMore,
    isLoading,
    isLoadingMore,
    loadMoreDesigns,
    reloadDesigns,
  } = useDesigns(listQuery);
  const catalogTags = useCatalogTags({ includeArchived: true });

  const [selectedDesignId, setSelectedDesignId] = useState<string | null>(null);
  const [liveDesign, setLiveDesign] = useState<Design | null>(null);
  const [ignoredTagsByDesignId, setIgnoredTagsByDesignId] = useState<Map<string, string[]>>(
    () => {
      try {
        const raw = sessionStorage.getItem("aiReview.ignoredTags");
        if (raw) {
          const parsed = JSON.parse(raw) as Record<string, string[]>;
          return new Map(Object.entries(parsed));
        }
      } catch {
        // corrupt storage — start fresh
      }
      return new Map();
    },
  );
  const [pendingRerun, setPendingRerun] = useState(false);

  const [pendingSelection, setPendingSelection] = useState<PendingSelectionChange | null>(null);
  const queueScrollTopRef = useRef(0);
  const queueListRef = useRef<HTMLDivElement | null>(null);
  const pendingAdvanceIndexRef = useRef<number | null>(null);
  const pendingCrossTabSelectionRef = useRef<PendingCrossTabSelection | null>(null);
  const previousTabRef = useRef(filters.tab);
  const liveDesignRef = useRef<Design | null>(null);

  const isPinnedNeedsReviewDesign = resolveIsPinnedNeedsReviewDesign({
    tab: filters.tab,
      selectedDesignId,
      liveDesignId: liveDesign?.id,
      isRerunningAi: false,
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
  const [isSendingBackToProcessing, setIsSendingBackToProcessing] = useState(false);

  const canManageCatalog = Boolean(user && permissionService.canEditAiReviewInbox(user));
  const canApprove = Boolean(user && permissionService.canApproveDesignForCatalog(user));
  const canReject = Boolean(user && permissionService.canRejectDesignFromCatalog(user));
  const canApproveSuggestedTags = Boolean(user && permissionService.canApproveSuggestedTags(user));

  const selectedDesign = useMemo(() => {
    const listDesign = designs.find((design) => design.id === selectedDesignId) ?? null;

    if (
      shouldUseLiveDesignForSelection({
        liveDesign,
        selectedDesignId,
        tab: filters.tab,
        isPinnedNeedsReviewDesign,
      })
    ) {
      return resolveFreshestInboxDesign({
        liveDesign,
        listDesign,
      });
    }

    return listDesign;
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
    applyDesignPatch,
    defaultVisionModelId: options?.defaultVisionModelId ?? "",
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
        liveDesignRef.current = design;
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
    if (!selectedDesign || selectedDesign.id !== selectedDesignId || isDraftDirty || !canEditSelected) {
      return;
    }

    const nextDraft = createAiReviewDraftFromDesign(selectedDesign);
    setDraftForm(nextDraft);
    setBaselineForm(nextDraft);
  }, [canEditSelected, isDraftDirty, selectedDesign, selectedDesignId]);

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

    if (
      shouldSuppressDefaultInboxSelection({
        pendingCrossTabSelection: pendingCrossTabSelectionRef.current,
        selectedDesignId,
        tab: filters.tab,
      })
    ) {
      return;
    }

    if (designs.length === 0) {
      applySelection(null);
      return;
    }

    applySelection(designs[0] ?? null);
  }, [applySelection, designs, filters.tab, isLoading, selectedDesignId]);

  useEffect(() => {
    if (pendingAdvanceIndexRef.current !== null || isLoading) {
      return;
    }

    const pendingCrossTabSelection = pendingCrossTabSelectionRef.current;
    const pendingDesign = resolvePendingCrossTabDesign(
      designs,
      pendingCrossTabSelection,
      filters.tab,
    );

    if (pendingDesign) {
      applySelection(pendingDesign);
      pendingCrossTabSelectionRef.current = null;
      return;
    }

    if (
      shouldRetainCrossTabSelection({
        designs,
        pendingCrossTabSelection,
        selectedDesignId,
        tab: filters.tab,
      })
    ) {
      return;
    }

    if (designs.length === 0) {
      applySelection(null);
      return;
    }

    if (!selectedDesignId || !designs.some((design) => design.id === selectedDesignId)) {
      applySelection(designs[0] ?? null);
    }
  }, [applySelection, designs, filters.tab, isLoading, selectedDesignId]);

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

  const executeRerunToProcessing = useCallback(async () => {
    if (!user || !selectedDesign || (!canRerunSelected && !canRerunAiSuggestions)) {
      return;
    }

    const designId = selectedDesign.id;

    setIsActionLoading(true);
    setIsSendingBackToProcessing(true);
    setActionError(null);

    try {
      await aiReviewInboxService.rerunAiFromInbox(user, designId);
      pendingCrossTabSelectionRef.current = { tab: resolveRejectedRerunTargetTab(), designId };
      setSelectedDesignId(designId);
      setDraftForm(null);
      setBaselineForm(null);
      setLiveDesign(null);
      options?.onNavigateToTab?.(resolveRejectedRerunTargetTab(), designId);
      options?.onQueueChanged?.();
    } catch (rerunError) {
      pendingCrossTabSelectionRef.current = null;
      setActionError(
        rerunError instanceof Error
          ? rerunError.message
          : "Unable to send this design back to Processing.",
      );
    } finally {
      setIsSendingBackToProcessing(false);
      setIsActionLoading(false);
    }
  }, [canRerunAiSuggestions, canRerunSelected, options, selectedDesign, user]);

  const requestRerunAiSuggestions = useCallback(() => {
    if (!canRerunAiSuggestions && !canRerunSelected) {
      return;
    }

    if (isDraftDirty) {
      setPendingRerun(true);
      return;
    }

    void executeRerunToProcessing();
  }, [canRerunAiSuggestions, canRerunSelected, executeRerunToProcessing, isDraftDirty]);

  const confirmPendingRerun = useCallback(() => {
    setPendingRerun(false);
    void executeRerunToProcessing();
  }, [executeRerunToProcessing]);

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
    (field: keyof AiReviewDraftForm, value: string | boolean) => {
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

  const runRejectedTabNavigationAction = useCallback(
    async (input: { action: () => Promise<void>; targetTab: AiReviewInboxTab }) => {
      if (!user || !selectedDesign) {
        return;
      }

      const designId = selectedDesign.id;

      setIsActionLoading(true);
      setActionError(null);

      try {
        await input.action();
        pendingCrossTabSelectionRef.current = { tab: input.targetTab, designId };
        setSelectedDesignId(designId);
        setDraftForm(null);
        setBaselineForm(null);
        setLiveDesign(null);
        options?.onNavigateToTab?.(input.targetTab, designId);
        options?.onQueueChanged?.();
      } catch (navigationError) {
        pendingCrossTabSelectionRef.current = null;
        setActionError(
          navigationError instanceof Error
            ? navigationError.message
            : "Unable to complete the action.",
        );
      } finally {
        setIsActionLoading(false);
      }
    },
    [options, selectedDesign, user],
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

    await runRejectedTabNavigationAction({
      action: async () => {
        await aiReviewInboxService.reopenFromInbox(user, selectedDesign.id);
      },
      targetTab: resolveRejectedReopenTargetTab(),
    });
  }, [canReopenSelected, runRejectedTabNavigationAction, selectedDesign, user]);

  const rerunSelected = useCallback(() => {
    requestRerunAiSuggestions();
  }, [requestRerunAiSuggestions]);

  const retryProcessingSelected = useCallback(async () => {
    if (!user || !selectedDesign || !canRetryProcessingSelected) {
      return;
    }

    setIsActionLoading(true);
    setActionError(null);

    try {
      const result = await aiEnrichmentEnqueueService.retryFailedProcessing(selectedDesign.id, {
        visionModelIdOverride: processingQueue.resolvedSessionVisionModelId,
      });

      if (!result.queued) {
        throw new Error("AI processing could not be queued. Please try again.");
      }

      // Reflect the terminal AI state from the callable immediately; the reload below
      // reconciles against Firestore in the background.
      const patch = buildDesignPatchFromEnqueueResult(result);

      if (patch) {
        applyDesignPatch(selectedDesign.id, patch);
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
  }, [applyDesignPatch, canRetryProcessingSelected, options, processingQueue.resolvedSessionVisionModelId, reloadDesigns, selectedDesign, user]);

  const ignoreSuggestedTag = useCallback(
    (name: string) => {
      const normalizedName = normalizeSuggestedTagKey(name);

      if (!normalizedName || !selectedDesignId) {
        return;
      }

      setIgnoredTagsByDesignId((currentMap) => {
        const existing = currentMap.get(selectedDesignId) ?? [];

        if (existing.includes(normalizedName)) {
          return currentMap;
        }

        const nextMap = new Map(currentMap);
        nextMap.set(selectedDesignId, [...existing, normalizedName]);

        try {
          sessionStorage.setItem(
            "aiReview.ignoredTags",
            JSON.stringify(Object.fromEntries(nextMap)),
          );
        } catch {
          // storage unavailable — ignore
        }

        return nextMap;
      });
    },
    [selectedDesignId],
  );

  const approveSuggestedTag = useCallback(
    async (sourceName: string, input: CreateCatalogTagInput, addToDraft: boolean) => {
      if (!user || !canApproveSuggestedTags) {
        return;
      }

      setIsActionLoading(true);
      setActionError(null);

      try {
        const approvedTag = await catalogTags.approveSuggestedTag(input);
        ignoreSuggestedTag(sourceName);

        if (addToDraft) {
          setDraftForm((currentDraft) =>
            currentDraft ? addApprovedSuggestedTagToDraftTags(currentDraft, approvedTag.name) : currentDraft,
          );
        }
      } catch (approvalError) {
        setActionError(
          approvalError instanceof Error ? approvalError.message : "Unable to approve suggested tag.",
        );
      } finally {
        setIsActionLoading(false);
      }
    },
    [canApproveSuggestedTags, catalogTags, ignoreSuggestedTag, user],
  );

  const ignoredSuggestedTagNames = selectedDesignId
    ? (ignoredTagsByDesignId.get(selectedDesignId) ?? [])
    : [];

  return {
    actionError,
    approvedTags: catalogTags.tags,
    baselineForm,
    canApprove: canApproveSelected,
    canEdit: canEditSelected,
    canReject: canRejectSelected,
    canReopen: canReopenSelected,
    canRerun: canRerunSelected,
    canRetryProcessing: canRetryProcessingSelected,
    canRerunAiSuggestions,
    canApproveSuggestedTags,
    showReadOnlySuggestions,
    activeTab: filters.tab,
    cancelPendingSelection,
    confirmPendingRerun,
    confirmDiscardPendingSelection,
    designs,
    draftForm,
    error,
    filters,
    hasMore,
    isActionLoading,
    isDraftDirty,
    isLoading,
    isLoadingMore,
    isRerunningAi: isSendingBackToProcessing,
    ignoredSuggestedTagNames,
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
    approveSuggestedTag,
    ignoreSuggestedTag,
    updateDraftField,
    processingQueue,
  };
}
