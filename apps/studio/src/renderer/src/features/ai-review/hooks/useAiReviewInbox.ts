import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { designDocumentSubscriptionService } from "../../designs/services/designDocumentSubscriptionService";
import { catalogTagService } from "../../designs/services/catalogTagService";
import { designService } from "../../designs/services/designService";
import { useDesigns } from "../../designs/hooks/useDesigns";
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
import {
  NEEDS_REVIEW_SEARCH_HYDRATION_CAP,
  filterNeedsReviewDesignsBySearch,
  isNeedsReviewSearchActive,
  resolveNeedsReviewHydrationTarget,
  resolveNeedsReviewSearchHydrationState,
  shouldAutoLoadNeedsReviewSearch,
} from "../utils/aiReviewNeedsReviewSearch";
import { traceAiQueueEvent } from "../../../config/aiQueueTraceClient";
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
  resolveFreshestInboxDesign,
  shouldPrependPinnedDesignToInbox,
  shouldRetainCrossTabSelection,
  shouldSuppressDefaultInboxSelection,
  shouldUseLiveDesignForSelection,
  type PendingCrossTabSelection,
} from "../utils/aiReviewInboxSelection";
import {
  reconcileSuccessfulHardDelete,
  reconcileSuccessfulInboxManualAction,
  reconcileSuccessfulReprocess,
  recoverFailedInboxManualAction,
  type AiReviewInboxManualAction,
  type AiReviewTabCountDeltas,
} from "../utils/aiReviewLocalReconciliation";

export interface UseAiReviewInboxOptions {
  defaultVisionModelId: string;
  onNavigateToTab?: (tab: AiReviewInboxTab, designId: string) => void;
  /** Authoritative three-tab count refresh (Processing / queue / failure recovery). */
  onQueueChanged?: () => void;
  /** Amendment 9 P0: local count deltas after successful approve/reject/archive. */
  onInboxCountsDelta?: (deltas: AiReviewTabCountDeltas) => void;
  /** Exact Needs Review tab count for search hydration status. */
  needsReviewTotalCount?: number | null;
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
  const needsReviewSearchActive =
    filters.tab === "needs_review" && isNeedsReviewSearchActive(filters.searchQuery);
  const {
    applyDesignPatch,
    clearTerminalAiProcessingLedgerEntry,
    designs: rawDesigns,
    error,
    hasMore,
    hasTerminalAiProcessingLedgerEntry,
    isLoading,
    isLoadingMore,
    loadMoreDesigns,
    reloadDesigns,
    removeDesignFromList,
  } = useDesigns(listQuery, {
    loadAll: needsReviewSearchActive,
    maxLoadAll: NEEDS_REVIEW_SEARCH_HYDRATION_CAP,
  });
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
  /**
   * Owner QA Amendment 7: read-only mirrors of `options`, `designs`, and `selectedDesignId`,
   * assigned directly here in the hook body during render (never inside a `useEffect`), mirroring
   * the existing `designsMirrorRef`/`listQueryKeyRef` pattern in `useDesigns.ts`. The background
   * queue observer subscription effect below reads these instead of closing over the live
   * variables, so a design-list or selection update — including the update the observer's own
   * `applyDesignPatch` call just caused — never forces that effect to unsubscribe and resubscribe.
   * Before this fix, `designs` and `options` (a fresh object/callback literal from the parent on
   * every render) were both in that effect's dependency array, so every successful reconciliation
   * tore down and recreated its own subscription — the exact runaway loop the owner's trace
   * captured (observer.subscribed repeating after nearly every state replacement).
   */
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const designsRef = useRef<Design[]>([]);
  const selectedDesignIdRef = useRef<string | null>(null);
  selectedDesignIdRef.current = selectedDesignId;
  /**
   * Owner QA Amendment 7 follow-up: the live-design backend-completion reconciliation effect
   * below must reload/reconcile at most once per genuine completion, not once per render for as
   * long as the completed design remains selected. Tracks the design ID this effect has already
   * reconciled so a subsequent render observing the same still-"needs_review" liveDesign is a
   * no-op. The effect itself clears this back to null as soon as that design's liveDesign moves
   * off "needs_review" (e.g. sent back to Processing via Retry/Rerun), so a later, genuinely new
   * completion of the *same* design ID is still correctly reconciled — this ref intentionally
   * does not simply track "the current liveDesign.id", since it must keep remembering "already
   * reconciled" across every render while the design stays completed and selected, independent of
   * how many times `liveDesign`'s own object reference changes in the meantime.
   */
  const alreadyReconciledLiveDesignIdRef = useRef<string | null>(null);

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

    const sorted = sortInboxDesigns(filtered, filters.tab, filters.sortOrder);

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
  }, [filters.sortOrder, filters.tab, isPinnedNeedsReviewDesign, liveDesign, rawDesigns]);

  const tabMatchedDesigns = useMemo(() => {
    let filtered = rawDesigns.filter((design) => designMatchesInboxTab(design, filters.tab));

    if (filters.tab === "processing") {
      filtered = filterDesignsByAiReviewStatus(filtered, "pending");
    }

    return filtered;
  }, [filters.tab, rawDesigns]);

  const visibleDesigns = useMemo(() => {
    if (filters.tab !== "needs_review" || !isNeedsReviewSearchActive(filters.searchQuery)) {
      return designs;
    }

    return sortInboxDesigns(
      filterNeedsReviewDesignsBySearch(
        tabMatchedDesigns,
        filters.searchQuery ?? "",
        generatedTaxonomy.tags,
      ),
      filters.tab,
      filters.sortOrder,
    );
  }, [designs, filters.searchQuery, filters.sortOrder, filters.tab, generatedTaxonomy.tags, tabMatchedDesigns]);
  designsRef.current = visibleDesigns;

  const [draftForm, setDraftForm] = useState<AiReviewDraftForm | null>(null);
  const [baselineForm, setBaselineForm] = useState<AiReviewDraftForm | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isSavingArtworkBackground, setIsSavingArtworkBackground] = useState(false);
  const [isSavingHalftone, setIsSavingHalftone] = useState(false);
  const [isSendingBackToProcessing, setIsSendingBackToProcessing] = useState(false);
  /** Amendment 9 P0 scroll correction: bump only after successful approve/reject/archive. */
  const [reviewScrollNonce, setReviewScrollNonce] = useState(0);
  const [needsReviewHydrationTarget, setNeedsReviewHydrationTarget] = useState(
    NEEDS_REVIEW_SEARCH_HYDRATION_CAP,
  );

  useEffect(() => {
    if (filters.tab !== "needs_review" || !isNeedsReviewSearchActive(filters.searchQuery)) {
      setNeedsReviewHydrationTarget(NEEDS_REVIEW_SEARCH_HYDRATION_CAP);
    }
  }, [filters.searchQuery, filters.tab]);

  const canManageCatalog = Boolean(user && permissionService.canEditAiReviewInbox(user));
  const canApprove = Boolean(user && permissionService.canApproveDesignForCatalog(user));
  const canReject = Boolean(user && permissionService.canRejectDesignFromCatalog(user));
  const canApproveSuggestedTags = Boolean(user && permissionService.canApproveSuggestedTags(user));

  const needsReviewHydratedCount =
    filters.tab === "needs_review" ? tabMatchedDesigns.length : 0;

  const searchHydrationBase = useMemo(() => {
    if (filters.tab !== "needs_review" || !isNeedsReviewSearchActive(filters.searchQuery)) {
      return null;
    }

    const isSearchingHydration = isLoading || isLoadingMore;

    return resolveNeedsReviewSearchHydrationState({
      searchQuery: filters.searchQuery,
      hydratedCount: needsReviewHydratedCount,
      filteredCount: visibleDesigns.length,
      totalCount: options?.needsReviewTotalCount ?? null,
      hasMore: isSearchingHydration ? true : hasMore,
      hydrationTarget: needsReviewHydrationTarget,
      isLoadingMore: isSearchingHydration,
    });
  }, [
    filters.searchQuery,
    filters.tab,
    hasMore,
    isLoading,
    isLoadingMore,
    needsReviewHydratedCount,
    needsReviewHydrationTarget,
    options?.needsReviewTotalCount,
    visibleDesigns.length,
  ]);

  const searchMore = useCallback(() => {
    setNeedsReviewHydrationTarget((current) =>
      resolveNeedsReviewHydrationTarget({ currentTarget: current, allowBeyondInitialCap: true }),
    );
  }, []);

  const searchHydration = searchHydrationBase
    ? { ...searchHydrationBase, searchMore }
    : null;

  useEffect(() => {
    if (
      needsReviewSearchActive ||
      !shouldAutoLoadNeedsReviewSearch({
        searchQuery: filters.searchQuery,
        loadedCount: needsReviewHydratedCount,
        hydrationTarget: needsReviewHydrationTarget,
        hasMore,
        isLoading,
        isLoadingMore,
      })
    ) {
      return;
    }

    loadMoreDesigns();
  }, [
    filters.searchQuery,
    hasMore,
    isLoading,
    isLoadingMore,
    loadMoreDesigns,
    needsReviewHydratedCount,
    needsReviewHydrationTarget,
    needsReviewSearchActive,
  ]);

  const selectedDesign = useMemo(() => {
    const listDesign = visibleDesigns.find((design) => design.id === selectedDesignId) ?? null;

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
  }, [filters.tab, isPinnedNeedsReviewDesign, liveDesign, selectedDesignId, visibleDesigns]);

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
    () => (selectedDesignId ? visibleDesigns.findIndex((design) => design.id === selectedDesignId) : -1),
    [selectedDesignId, visibleDesigns],
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
    hasTerminalAiProcessingLedgerEntry,
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
        const previous = liveDesignRef.current;
        if (
          previous?.id === design.id &&
          previous.updatedAt.toMillis() > design.updatedAt.toMillis()
        ) {
          return;
        }

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

  // Owner QA Amendment 7 follow-up: this effect previously depended on `options` and re-ran its
  // body — not merely resubscribed — on every render in which `liveDesign.aiReviewStatus` was
  // still "needs_review". Because nothing here ever advances `selectedDesignId` away from the
  // just-completed design, and `options` is a fresh object/callback literal from the parent on
  // every render, the effect's own `reloadDesigns()` call (which changes `designs`, forcing a
  // parent re-render, which changes `options`, which re-runs this effect) fed itself indefinitely
  // for as long as the completed design remained selected — a tight `load.start -> load.response
  // -> load.accepted` cycle every ~20ms, visible in the owner's trace as `processingCount: 1`
  // repeating hundreds of times with the same single design ID, and to the user as that one
  // design's tile appearing to "stick" (frozen re-renders of the same reload) until the whole
  // batch finished. `alreadyReconciledLiveDesignIdRef` makes this a one-shot reconciliation per
  // design per completion, exactly like the Amendment 5 mount-reconciliation effect below is a
  // one-shot check per tab activation — and `optionsRef` (declared above) removes the unstable
  // dependency entirely, matching the observer subscription effect's fix.
  useEffect(() => {
    if (!liveDesign || filters.tab !== "processing") {
      return;
    }

    if (liveDesign.aiReviewStatus !== "needs_review") {
      // Not (or no longer) in the completed state this effect reconciles — clear the guard so a
      // *future* completion of this same design (e.g. sent back to Processing via "Retry" or
      // "Rerun" and completing again later) is still reconciled once. Without this, the guard
      // would permanently remember this design's ID from an earlier completion and silently skip
      // its next genuine completion.
      if (alreadyReconciledLiveDesignIdRef.current === liveDesign.id) {
        alreadyReconciledLiveDesignIdRef.current = null;
      }
      return;
    }

    if (alreadyReconciledLiveDesignIdRef.current !== liveDesign.id) {
      // Backend-initiated completion (no client action) — Amendment 2, Defect A: reconcile the
      // Processing/Needs Review counts alongside the list, not just the list.
      // Approach C (monotonic repair): apply the live document's terminal status as a local patch
      // (records ledger + invalidates page cache) and skip the redundant list reload. A post-patch
      // reload was the primary reintroduction vector for completed designs via stale/cached pending
      // pages. Counts still refresh via onQueueChanged.
      alreadyReconciledLiveDesignIdRef.current = liveDesign.id;
      applyDesignPatch(liveDesign.id, {
        aiReviewStatus: liveDesign.aiReviewStatus,
        ...(typeof liveDesign.aiProcessingStage === "string"
          ? { aiProcessingStage: liveDesign.aiProcessingStage }
          : {}),
      });
      optionsRef.current?.onQueueChanged?.();
    }
  }, [applyDesignPatch, filters.tab, liveDesign]);

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
  //
  // Owner QA Amendment 7: this effect previously depended on `designs`, `selectedDesignId`, and
  // `options` directly. `options` is a fresh object/callback literal from the parent
  // (`AiReviewPage`) on every render, and `designs` gets a new array reference every time
  // `applyDesignPatch`/`reloadDesigns` resolve — including as a *direct result* of this very
  // effect's own reconciliation. That made the effect unsubscribe and resubscribe after nearly
  // every state replacement, which the owner's runtime trace captured as a runaway
  // `observer.subscribed` loop (request IDs climbing ~344→584 in 5.5s). `applyDesignPatch` and
  // `reloadDesigns` are already stable (`useCallback` with dependencies that do not change in
  // this context — confirmed in `useDesigns.ts`), so the only genuine trigger this effect needs
  // is `filters.tab`: it must subscribe exactly once per Processing-tab mount or inactive->active
  // transition, never per state update. `designsRef`/`selectedDesignIdRef`/`optionsRef` (assigned
  // during render, above) let the long-lived observer callback always read the current values
  // without forcing a resubscription when they change.
  useEffect(() => {
    if (filters.tab !== "processing") {
      return;
    }

    traceAiQueueEvent({
      event: "observer.subscribed",
      source: "inbox",
      selectedDesignId: selectedDesignIdRef.current,
      activeQueueDesignId: getActiveBackgroundAiDesignId(),
      processingDesignIds: designsRef.current.map((design) => design.id),
      processingCount: designsRef.current.length,
    });

    return subscribeToBackgroundAiQueue((event) => {
      const currentDesigns = designsRef.current;
      const currentSelectedDesignId = selectedDesignIdRef.current;
      const reconciliation = reconcileBackgroundAiQueueEvent(
        event,
        currentDesigns,
        currentSelectedDesignId,
      );

      traceAiQueueEvent({
        event: "observer.received",
        source: "inbox",
        designId: event.designId,
        selectedDesignId: currentSelectedDesignId,
        activeQueueDesignId: getActiveBackgroundAiDesignId(),
        processingDesignIds: currentDesigns.map((design) => design.id),
        processingCount: currentDesigns.length,
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
          selectedDesignId: currentSelectedDesignId,
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
        optionsRef.current?.onQueueChanged?.();
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
      optionsRef.current?.onQueueChanged?.();
    });
  }, [applyDesignPatch, filters.tab, reloadDesigns]);

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
      const resetResult = await aiReviewInboxService.rerunAiFromInbox(user, designId);
      // Clear any prior terminal-leave ledger entry so this design may legitimately reappear as
      // pending when the staff member later opens Processing.
      clearTerminalAiProcessingLedgerEntry(designId);
      setDraftForm(null);
      setBaselineForm(null);
      // Stay on the current Needs Review / Rejected tab: patch-primary local reconcile (no list
      // reload, no Processing navigation). Stale page-cache hits must not reinsert the design.
      reconcileSuccessfulReprocess({
        designId,
        resetResult,
        sourceTab: filters.tab,
        selectedIndex,
        deps: {
          clearLiveDesign: () => {
            setLiveDesign(null);
          },
          setPendingAdvanceIndex: (index) => {
            pendingAdvanceIndexRef.current = index;
          },
          applyDesignPatch,
          invalidateReadCaches: (id) => {
            designService.invalidateReadCaches(id);
          },
          onInboxCountsDelta: (deltas) => {
            optionsRef.current?.onInboxCountsDelta?.(deltas);
          },
        },
      });
    } catch (rerunError) {
      setActionError(
        rerunError instanceof Error
          ? rerunError.message
          : "Unable to send this design back to Processing.",
      );
    } finally {
      setIsSendingBackToProcessing(false);
      setIsActionLoading(false);
    }
  }, [
    applyDesignPatch,
    canRerunAiSuggestions,
    canRerunSelected,
    clearTerminalAiProcessingLedgerEntry,
    filters.tab,
    selectedDesign,
    selectedIndex,
    user,
  ]);

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
      if (selectedIndex < 0 || visibleDesigns.length === 0) {
        return;
      }

      const nextIndex = Math.min(Math.max(selectedIndex + offset, 0), visibleDesigns.length - 1);
      const nextDesign = visibleDesigns[nextIndex];

      if (nextDesign) {
        requestSelectDesign(nextDesign.id);
      }
    },
    [requestSelectDesign, selectedIndex, visibleDesigns],
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
        applyDesignPatch(updated.id, updated);
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
            ? saveError.message.includes("permission")
              ? `${saveError.message} If this persists on AI Processing, redeploy firestore.rules to DEV (preview-control fast path).`
              : saveError.message
            : "Unable to save artwork background.",
        );
      } finally {
        setIsSavingArtworkBackground(false);
      }
    },
    [applyDesignPatch, canSaveArtworkBackground, selectedDesign, user],
  );

  const saveHalftoneStaffDecision = useCallback(
    async (markAsHalftone: boolean) => {
      if (!user || !selectedDesign || !canSaveArtworkBackground) {
        return;
      }

      setIsSavingHalftone(true);
      setActionError(null);

      const artworkBackground = {
        artworkBackgroundPreset: markAsHalftone ? ("lightBlack" as const) : ("grey" as const),
        artworkBackgroundCustomHex: "",
      };

      try {
        const updated = await aiReviewInboxService.updateHalftoneFromInbox(
          user,
          selectedDesign,
          markAsHalftone,
        );
        applyDesignPatch(updated.id, updated);
        liveDesignRef.current = updated;
        setLiveDesign(updated);
        setDraftForm((currentDraft) =>
          currentDraft
            ? {
                ...currentDraft,
                markAsHalftone,
                artworkBackgroundPreset: artworkBackground.artworkBackgroundPreset,
                artworkBackgroundCustomHex: artworkBackground.artworkBackgroundCustomHex,
              }
            : currentDraft,
        );
        setBaselineForm((currentBaseline) =>
          currentBaseline
            ? {
                ...currentBaseline,
                markAsHalftone,
                artworkBackgroundPreset: artworkBackground.artworkBackgroundPreset,
                artworkBackgroundCustomHex: artworkBackground.artworkBackgroundCustomHex,
              }
            : currentBaseline,
        );
      } catch (saveError) {
        setActionError(
          saveError instanceof Error ? saveError.message : "Unable to update halftone.",
        );
      } finally {
        setIsSavingHalftone(false);
      }
    },
    [applyDesignPatch, canSaveArtworkBackground, selectedDesign, user],
  );

  const runInboxAction = useCallback(
    async (input: {
      action: () => Promise<Design>;
      manualAction: AiReviewInboxManualAction;
    }) => {
      if (!user) {
        return;
      }

      setIsActionLoading(true);
      setActionError(null);

      try {
        const updated = await input.action();
        reconcileSuccessfulInboxManualAction({
          updated,
          manualAction: input.manualAction,
          sourceTab: filters.tab,
          selectedIndex,
          deps: {
            clearLiveDesign: () => {
              setLiveDesign(null);
            },
            setPendingAdvanceIndex: (index) => {
              pendingAdvanceIndexRef.current = index;
            },
            applyDesignPatch,
            onInboxCountsDelta: (deltas) => {
              optionsRef.current?.onInboxCountsDelta?.(deltas);
            },
          },
        });
        setReviewScrollNonce((current) => current + 1);
      } catch (inboxError) {
        setActionError(
          inboxError instanceof Error ? inboxError.message : "Unable to complete the action.",
        );
        await recoverFailedInboxManualAction({
          clearPendingAdvance: () => {
            pendingAdvanceIndexRef.current = null;
          },
          reloadDesigns,
          onQueueChanged: () => optionsRef.current?.onQueueChanged?.(),
        });
      } finally {
        setIsActionLoading(false);
      }
    },
    [applyDesignPatch, filters.tab, reloadDesigns, selectedIndex, user],
  );

  const reconcileAfterHardDeleteSuccess = useCallback(
    (designId: string) => {
      const indexInList = designsRef.current.findIndex((design) => design.id === designId);
      reconcileSuccessfulHardDelete({
        designId,
        sourceTab: filters.tab,
        selectedIndex: indexInList >= 0 ? indexInList : selectedIndex,
        deps: {
          clearLiveDesign: () => {
            liveDesignRef.current = null;
            setLiveDesign(null);
          },
          setPendingAdvanceIndex: (index) => {
            pendingAdvanceIndexRef.current = index;
          },
          removeDesignFromList,
          onInboxCountsDelta: (deltas) => {
            optionsRef.current?.onInboxCountsDelta?.(deltas);
          },
        },
      });
      setReviewScrollNonce((current) => current + 1);
    },
    [filters.tab, removeDesignFromList, selectedIndex],
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

    await runInboxAction({
      manualAction: "approve",
      action: async () => aiReviewInboxService.approveFromInbox(user, selectedDesign.id, draftForm),
    });
  }, [canApproveSelected, draftForm, runInboxAction, selectedDesign, user]);

  const rejectSelected = useCallback(async () => {
    if (!user || !selectedDesign || !canRejectSelected) {
      return;
    }

    await runInboxAction({
      manualAction: "reject",
      action: async () => aiReviewInboxService.rejectFromInbox(user, selectedDesign.id),
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

    await runInboxAction({
      manualAction: "archive",
      action: async () => aiReviewInboxService.archiveFromInbox(user, selectedDesign.id),
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
      // Allow this design to re-enter the pending Processing list after a genuine retry.
      clearTerminalAiProcessingLedgerEntry(selectedDesign.id);

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
  }, [
    applyDesignPatch,
    canRetryProcessingSelected,
    clearTerminalAiProcessingLedgerEntry,
    options,
    processingQueue.resolvedSessionVisionModelId,
    reloadDesigns,
    selectedDesign,
    user,
  ]);

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
    designs: visibleDesigns,
    draftForm,
    error,
    filters,
    hasMore,
    isActionLoading,
    isSavingArtworkBackground,
    isSavingHalftone,
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
    reconcileAfterHardDeleteSuccess,
    requestSelectDesign,
    reviewScrollNonce,
    searchHydration,
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
    saveHalftoneStaffDecision,
    updateDraftField,
    processingQueue,
  };
}
