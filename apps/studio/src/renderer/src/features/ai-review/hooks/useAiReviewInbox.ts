import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { designDocumentSubscriptionService } from "../../designs/services/designDocumentSubscriptionService";
import { catalogTagService } from "../../designs/services/catalogTagService";
import { useGeneratedDesignLibraryTaxonomy } from "../../designs/hooks/useGeneratedDesignLibraryTaxonomy";
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
  isDesignArchivableInInbox,
  isDesignRejectableInInbox,
  isDesignReopenableInInbox,
  isDesignRerunnableFromNeedsReview,
  isDesignRerunnableInInbox,
  isDesignRetryableInProcessing,
} from "../utils/aiReviewInboxEligibility";
import { filterDesignsByAiReviewStatus } from "../../designs/utils/designLibrarySearch";
import { useDesigns } from "../../designs/hooks/useDesigns";
import { traceAiQueueEvent } from "@fresh-prints/shared/utils/aiQueueTrace";
import {
  getActiveBackgroundAiDesignId,
  hasPendingBackgroundAiWork,
  subscribeToBackgroundAiQueue,
} from "../../imports/services/importAiBackgroundQueue";
import { reconcileBackgroundAiQueueEvent } from "../utils/backgroundAiQueueReconciliation";
import { useAiProcessingQueue } from "./useAiProcessingQueue";
import {
  addApprovedSuggestedTagToDraftTags,
  normalizeSuggestedTagKey,
} from "../utils/suggestedNewTags";
import {
  resolveAdvanceIndexAfterInboxRemoval,
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
  // Approved-tag display/autocomplete for normal review needs only id/name/aliases/status — the
  // generated client-safe taxonomy covers that with zero Firestore reads. The previous
  // `useCatalogTags({ includeArchived: true })` paged the entire ~1,122-doc tag corpus on every
  // AI Review mount (owner live-test evidence, 2026-07-25). Tag management keeps its own
  // Firestore-backed hooks; a tag approved mid-session enters the draft via the callable's own
  // returned name and appears in this list after the next snapshot republish.
  const generatedTaxonomy = useGeneratedDesignLibraryTaxonomy(user);

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
  const [isSavingArtworkBackground, setIsSavingArtworkBackground] = useState(false);
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
  const canArchiveSelected = Boolean(
    user &&
      permissionService.canArchiveDesigns(user) &&
      selectedDesign &&
      isDesignArchivableInInbox(selectedDesign, filters.tab),
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

  // Owner QA Amendment 6 derived/render-state probe. Answers, per render where the derived
  // state actually changed: which IDs the Processing bucket currently holds, whether the
  // selected design still belongs to that bucket, and whether the details pane is falling back
  // to a stale selected-design object (liveDesign / resolveFreshestInboxDesign) that survives
  // independently of Processing membership. Read-only: derives nothing new and changes no state.
  const renderProbeRef = useRef<string>("");
  useEffect(() => {
    if (filters.tab !== "processing") {
      return;
    }

    const processingIds = designs.map((design) => design.id);
    const selectedStillInList = selectedDesignId ? processingIds.includes(selectedDesignId) : false;
    const signature = [
      processingIds.join(","),
      selectedDesignId ?? "",
      selectedStillInList ? "in" : "out",
      selectedDesign?.aiProcessingStage ?? "",
      selectedDesign?.aiReviewStatus ?? "",
      liveDesign?.id ?? "",
    ].join("|");

    if (signature === renderProbeRef.current) {
      return;
    }
    renderProbeRef.current = signature;

    traceAiQueueEvent({
      event: "render.derived_state",
      source: "render",
      selectedDesignId,
      activeQueueDesignId: getActiveBackgroundAiDesignId(),
      processingDesignIds: processingIds,
      processingCount: processingIds.length,
      visibleStage: selectedDesign?.aiProcessingStage ?? null,
      incomingReviewStatus: selectedDesign?.aiReviewStatus ?? null,
      incomingStatus: selectedDesign?.status ?? null,
      outcome: [
        selectedStillInList ? "selected-in-processing" : "selected-NOT-in-processing",
        liveDesign ? `liveDesign=${liveDesign.id === selectedDesignId ? "selected" : "other"}` : "liveDesign=none",
        selectedDesign && !selectedStillInList ? "stale-selected-object-rendered" : "",
      ]
        .filter(Boolean)
        .join("|"),
    });
  }, [designs, filters.tab, liveDesign, selectedDesign, selectedDesignId]);

  const isDraftDirty = useMemo(() => {
    if (!draftForm || !baselineForm || !canEditSelected) {
      return false;
    }

    return isAiReviewDraftDirty(baselineForm, draftForm);
  }, [baselineForm, canEditSelected, draftForm]);

  const applySelection = useCallback((design: Design | null) => {
    traceAiQueueEvent({
      event: "inbox.selection_changed",
      source: "inbox",
      designId: design?.id ?? null,
      activeQueueDesignId: getActiveBackgroundAiDesignId(),
      visibleStage: design?.aiProcessingStage ?? null,
      incomingReviewStatus: design?.aiReviewStatus ?? null,
      outcome: design ? "selected" : "cleared",
    });

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
    onQueueChanged: options?.onQueueChanged,
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
      // Backend-initiated completion (no client action) — Amendment 2, Defect A: reconcile the
      // Processing/Needs Review counts alongside the list, not just the list.
      void reloadDesigns();
      options?.onQueueChanged?.();
    }
  }, [filters.tab, liveDesign, options, reloadDesigns]);

  // Owner QA Amendment 3, Failure 1 (initial fix) found that the background AI pump was
  // detached from this view. Owner QA Amendment 4 found that the Amendment 3 fix — an
  // unconditional reloadDesigns() per terminal event — was itself the source of a worse defect:
  // three designs completing in quick succession fired three independent, ungated reloads. Since
  // loadDesigns() had no protection against a same-query race (only a different-query guard),
  // an earlier-started-but-later-resolving read could overwrite state a later-started read (or
  // this hook's own patch) had already correctly updated — visibly regressing progress and
  // stalling the visible 3 -> 2 -> 1 -> 0 sequence into "stuck, then all disappear together."
  //
  // Fix: apply the enqueue result's own terminal fields as a local patch, by design ID, the
  // moment each design's own transition lands — the same authoritative-response pattern already
  // used for the manual/auto-queue paths (buildDesignPatchFromEnqueueResult). No reload is the
  // primary reconciliation mechanism; a design leaves Processing immediately because this hook's
  // own `designs` memo already re-filters by aiReviewStatus on every render. If the currently
  // selected design is the one that just completed, capture its index before patching so the
  // existing pendingAdvanceIndexRef effect (used elsewhere for approve/reject) selects the next
  // remaining design once `designs` recomputes — deterministic, not dependent on reload timing.
  useEffect(() => {
    if (filters.tab !== "processing") {
      return;
    }

    traceAiQueueEvent({
      event: "observer.subscribed",
      source: "inbox",
      selectedDesignId,
      activeQueueDesignId: getActiveBackgroundAiDesignId(),
      processingDesignIds: designs.map((design) => design.id),
      processingCount: designs.length,
    });

    return subscribeToBackgroundAiQueue((event) => {
      const reconciliation = reconcileBackgroundAiQueueEvent(event, designs, selectedDesignId);

      traceAiQueueEvent({
        event: "observer.received",
        source: "inbox",
        designId: event.designId,
        selectedDesignId,
        activeQueueDesignId: getActiveBackgroundAiDesignId(),
        processingDesignIds: designs.map((design) => design.id),
        processingCount: designs.length,
        incomingStage: event.patchSource?.aiProcessingStage ?? null,
        incomingReviewStatus: event.patchSource?.aiReviewStatus ?? null,
        incomingStatus: event.patchSource?.status ?? null,
        queueRemaining: event.pending,
        outcome: reconciliation.patch ? "patch" : "fallback-reload",
      });

      if (reconciliation.patch) {
        if (reconciliation.pendingAdvanceIndex !== null) {
          pendingAdvanceIndexRef.current = reconciliation.pendingAdvanceIndex;
        }

        traceAiQueueEvent({
          event: "inbox.applyDesignPatch",
          source: "inbox",
          designId: event.designId,
          selectedDesignId,
          incomingStage:
            typeof reconciliation.patch.aiProcessingStage === "string"
              ? reconciliation.patch.aiProcessingStage
              : null,
          incomingReviewStatus:
            typeof reconciliation.patch.aiReviewStatus === "string"
              ? reconciliation.patch.aiReviewStatus
              : null,
          outcome:
            reconciliation.pendingAdvanceIndex !== null
              ? `pendingAdvanceIndex=${reconciliation.pendingAdvanceIndex}`
              : "no-advance",
        });
        applyDesignPatch(event.designId, reconciliation.patch);
        options?.onQueueChanged?.();
        traceAiQueueEvent({
          event: "inbox.onQueueChanged",
          source: "inbox",
          designId: event.designId,
          outcome: "after-patch",
        });
        return;
      }

      // No usable patch (e.g. the enqueue call itself failed rather than completing) — fall
      // back to a reload for this one event only, still gated by useDesigns' own generation
      // guard against any other in-flight request.
      traceAiQueueEvent({
        event: "inbox.reloadDesigns",
        source: "inbox",
        designId: event.designId,
        outcome: "observer-fallback",
      });
      void reloadDesigns();
      options?.onQueueChanged?.();
    });
  }, [applyDesignPatch, designs, filters.tab, options, reloadDesigns, selectedDesignId]);

  // Owner QA Amendment 5: the background pump can start before the Processing tab is ever
  // mounted (e.g. import happens while the user is on a different route). subscribeToBackgroundAiQueue
  // only delivers events to observers subscribed at the moment they fire — a design that
  // completes (or is still mid-pipeline) entirely before this tab mounts produces no event this
  // hook instance ever sees. useDesigns' own initial load already reflects the true current
  // Firestore state at mount time, which is correct for any design that has already reached a
  // terminal state — but gives no signal about a design that is still genuinely in flight right
  // now. Reusing hasPendingBackgroundAiWork() (previously exported but never consumed) to trigger
  // one bounded, already-generation-guarded reconciliation pass on mount/tab-switch-to-processing
  // closes that gap without adding a listener, without restarting anything, and without
  // double-enqueueing — the pump itself is unaffected; this only asks the already-existing reload
  // path to double-check once whether pump activity happened while unmounted.
  useEffect(() => {
    traceAiQueueEvent({
      event: "inbox.tab_activated",
      source: "inbox",
      activeQueueDesignId: getActiveBackgroundAiDesignId(),
      outcome: `${filters.tab}|pendingWork=${hasPendingBackgroundAiWork()}`,
    });

    if (filters.tab !== "processing" || !hasPendingBackgroundAiWork()) {
      return;
    }

    traceAiQueueEvent({
      event: "inbox.reloadDesigns",
      source: "inbox",
      activeQueueDesignId: getActiveBackgroundAiDesignId(),
      outcome: "mount-pending-work",
    });
    void reloadDesigns();
    options?.onQueueChanged?.();
    // Deliberately mount/tab-switch-only: re-running this effect on every `designs` change would
    // turn a bounded one-time check into an unbounded reload loop. filters.tab is the only
    // dependency that should re-trigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount/tab-switch-only trigger
  }, [filters.tab]);

  useEffect(() => {
    if (isLoading || pendingAdvanceIndexRef.current === null) {
      return;
    }

    if (designs.length === 0) {
      pendingAdvanceIndexRef.current = null;
      applySelection(null);
      return;
    }

    const nextIndex = resolveAdvanceIndexAfterInboxRemoval(
      designs.length,
      pendingAdvanceIndexRef.current,
    );

    if (nextIndex === null) {
      pendingAdvanceIndexRef.current = null;
      applySelection(null);
      return;
    }

    const nextDesign = designs[nextIndex] ?? null;

    if (!nextDesign) {
      pendingAdvanceIndexRef.current = null;
      applySelection(null);
      return;
    }

    // Keep pending until selection sticks so the retention effect cannot fall back to designs[0]
    // in the same flush (selectedDesignId still points at the removed design until setState applies).
    if (selectedDesignId === nextDesign.id) {
      pendingAdvanceIndexRef.current = null;
      return;
    }

    applySelection(nextDesign);
  }, [applySelection, designs, isLoading, selectedDesignId]);

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
      // Reconcile the Processing list and its count deterministically, rather than relying
      // solely on tab navigation's own side-effect refetch (a real navigation happens to
      // trigger a fresh listDesignsPage call, which previously masked this gap — but a design
      // whose reprocessing completes without the user changing tabs, or whose completion lands
      // between this reset and the navigation, could leave the Processing list/count stale
      // until an unrelated remount). See the matching reloadDesigns -> onQueueChanged sequence
      // in runInboxAction above (post-launch-catalog-and-processing-stability, Workstream D).
      await reloadDesigns();
      options?.onQueueChanged?.();
      options?.onNavigateToTab?.(resolveRejectedRerunTargetTab(), designId);
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
  }, [canRerunAiSuggestions, canRerunSelected, options, reloadDesigns, selectedDesign, user]);

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

  const canSaveArtworkBackground = Boolean(
    user && permissionService.canEditDesigns(user) && selectedDesign,
  );

  const saveArtworkBackground = useCallback(
    async (values: Pick<AiReviewDraftForm, "artworkBackgroundPreset" | "artworkBackgroundCustomHex">) => {
      if (!user || !selectedDesign || !canSaveArtworkBackground) {
        return;
      }

      setIsSavingArtworkBackground(true);
      setActionError(null);

      try {
        const updated = await aiReviewInboxService.updateArtworkBackgroundFromInbox(
          user,
          selectedDesign.id,
          values,
        );
        liveDesignRef.current = updated;
        setLiveDesign(updated);
        setDraftForm((currentDraft) =>
          currentDraft
            ? {
                ...currentDraft,
                artworkBackgroundPreset: values.artworkBackgroundPreset,
                artworkBackgroundCustomHex: values.artworkBackgroundCustomHex,
              }
            : currentDraft,
        );
        setBaselineForm((currentBaseline) =>
          currentBaseline
            ? {
                ...currentBaseline,
                artworkBackgroundPreset: values.artworkBackgroundPreset,
                artworkBackgroundCustomHex: values.artworkBackgroundCustomHex,
              }
            : currentBaseline,
        );
      } catch (saveError) {
        setActionError(
          saveError instanceof Error
            ? saveError.message
            : "Unable to save artwork background.",
        );
      } finally {
        setIsSavingArtworkBackground(false);
      }
    },
    [canSaveArtworkBackground, selectedDesign, user],
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

  const archiveSelected = useCallback(async () => {
    if (!user || !selectedDesign || !canArchiveSelected) {
      return;
    }

    await runInboxAction(async () => {
      await aiReviewInboxService.archiveFromInbox(user, selectedDesign.id);
    });
  }, [canArchiveSelected, runInboxAction, selectedDesign, user]);

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
        // Lazy, on-demand mutation — does not require the tag corpus to be preloaded.
        const approvedTag = await catalogTagService.approveSuggestedTag(user, input);
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
    [canApproveSuggestedTags, ignoreSuggestedTag, user],
  );

  const ignoredSuggestedTagNames = selectedDesignId
    ? (ignoredTagsByDesignId.get(selectedDesignId) ?? [])
    : [];

  return {
    actionError,
    approvedTags: generatedTaxonomy.tags,
    baselineForm,
    canApprove: canApproveSelected,
    canArchive: canArchiveSelected,
    canEdit: canEditSelected,
    canSaveArtworkBackground,
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
    isSavingArtworkBackground,
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
    archiveSelected,
    rejectSelected,
    reopenSelected,
    rerunSelected,
    requestRerunAiSuggestions,
    retryProcessingSelected,
    approveSuggestedTag,
    ignoreSuggestedTag,
    saveArtworkBackground,
    updateDraftField,
    processingQueue,
  };
}
