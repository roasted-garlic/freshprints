import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { isDeleteEligibleUnapprovedDesignStatus } from "@fresh-prints/shared/utils/deleteEligibleUnapprovedDesignValidation";

import { ConfirmLeaveDialog } from "../../../shared/components/ConfirmLeaveDialog";
import { Button } from "../../../shared/components/Button";
import { GlobalSearchField } from "../../../shared/components/GlobalSearchField";
import type { SelectOption } from "../../../shared/components/Select";
import { useShellHeaderConfig } from "../../../shared/hooks/useShellHeaderConfig";
import { DeleteEligibleUnapprovedDesignDialog } from "../../designs/components/DeleteEligibleUnapprovedDesignDialog";
import { useDeleteEligibleUnapprovedDesign } from "../../designs/hooks/useDeleteEligibleUnapprovedDesign";
import type { Design } from "../../designs/types/design.types";
import { useGeneratedDesignLibraryTaxonomy } from "../../designs/hooks/useGeneratedDesignLibraryTaxonomy";
import {
  mapArtworkBackgroundToForm,
  resolveFormArtworkBackgroundHex,
} from "../../designs/utils/designFormMapper";
import {
  AI_PROCESSING_PAGE_DESCRIPTION,
  AI_PROCESSING_PAGE_TITLE,
  AI_REVIEW_INBOX_TABS,
  buildAiReviewInboxSearchParams,
  getAiReviewTabDescription,
  parseAiReviewInboxFilters,
} from "../constants/aiReviewInboxConstants";
import { AiReviewErrorBoundary } from "../components/AiReviewErrorBoundary";
import { AiReviewInboxSortToggle } from "../components/AiReviewInboxSortToggle";
import { AiReviewQueueList } from "../components/AiReviewQueueList";
import { AiReviewQueueStats } from "../components/AiReviewQueueStats";
import { AiReviewQueryErrorPanel } from "../components/AiReviewQueryErrorPanel";
import { AiReviewWorkspace } from "../components/AiReviewWorkspace";
import { useAiReviewInbox } from "../hooks/useAiReviewInbox";
import { useAiReviewKeyboardShortcuts } from "../hooks/useAiReviewKeyboardShortcuts";
import { useAiReviewTabCounts } from "../hooks/useAiReviewTabCounts";
import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { useAiEnrichmentSettings } from "../../settings/hooks/useAiEnrichmentSettings";
import { useAiReviewMainPanelHeight } from "../hooks/useAiReviewMainPanelHeight";
import type { AiReviewInboxFilters, AiReviewInboxTab } from "../types/aiReviewInbox.types";
import { resolveAiReviewInboxSortOrder } from "../utils/aiReviewInboxSort";
import { shouldShowNeedsReviewSearchNoResults } from "../utils/aiReviewNeedsReviewSearch";
import {
  applyAiReviewMultiSelectRange,
  collectSuccessfulHardDeleteIds,
  emptyAiReviewMultiSelectState,
  orderHardDeleteReconcileIds,
  resolveAiReviewHardDeleteTargets,
  seedAiReviewMultiSelectIds,
  toggleAiReviewMultiSelectId,
} from "../utils/aiReviewQueueMultiSelect";
import { resolveHardDeleteTotalFailureMessage } from "../utils/resolveHardDeleteTotalFailureMessage";

function AiReviewPageContent() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [needsReviewSearchQuery, setNeedsReviewSearchQuery] = useState("");
  const filters = useMemo(() => parseAiReviewInboxFilters(searchParams), [searchParams]);
  const inboxFilters = useMemo<AiReviewInboxFilters>(
    () => ({
      ...filters,
      searchQuery: filters.tab === "needs_review" ? needsReviewSearchQuery : undefined,
    }),
    [filters, needsReviewSearchQuery],
  );
  const canManageProcessingSettings = permissionService.canManageSettings(user);
  const canDeleteEligibleUnapprovedDesigns =
    permissionService.canDeleteEligibleUnapprovedDesigns(user);
  const {
    clearError: clearHardDeleteError,
    deleteDesigns: hardDeleteDesigns,
    error: hardDeleteError,
    isSubmitting: isHardDeleting,
    reportError: reportHardDeleteError,
  } = useDeleteEligibleUnapprovedDesign();
  const [designsToHardDelete, setDesignsToHardDelete] = useState<Design[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [multiSelectedIds, setMultiSelectedIds] = useState<string[]>([]);
  const [multiSelectAnchorId, setMultiSelectAnchorId] = useState<string | null>(null);

  // Read-only, active-only filter dropdown data — reuses the same zero-Firestore-read generated
  // client-safe taxonomy snapshot the Design Library already consumes (Wave C amendment,
  // 2026-07-24), instead of the Firestore-backed `useCategories()`. The snapshot only ever contains
  // active categories, matching the `isActive` filter this page already applied. A failed snapshot
  // load must be visible (never a silently-empty dropdown) — required by the 2026-07-25 independent
  // review; there is no Firestore fallback here by design (fail closed).
  const { categories, status: taxonomyStatus } = useGeneratedDesignLibraryTaxonomy(user);

  const categoryOptions = useMemo<SelectOption[]>(
    () =>
      categories
        .filter((category) => category.isActive)
        .map((category) => ({ label: category.name, value: category.id })),
    [categories],
  );

  const tabCounts = useAiReviewTabCounts();
  const enrichmentSettings = useAiEnrichmentSettings();
  const { layoutStyle, mainPanelRef } = useAiReviewMainPanelHeight();

  const handleNavigateToTab = useCallback(
    (tab: AiReviewInboxTab) => {
      setSearchParams(buildAiReviewInboxSearchParams({ tab, sortOrder: filters.sortOrder }), {
        replace: true,
      });
    },
    [filters.sortOrder, setSearchParams],
  );

  const inbox = useAiReviewInbox(inboxFilters, {
    defaultVisionModelId: enrichmentSettings.visionModelId,
    onNavigateToTab: handleNavigateToTab,
    // Processing / background queue still refreshes authoritative counts.
    onQueueChanged: () => void tabCounts.reloadCounts(),
    // Amendment 9 P0: successful approve/reject/archive adjust badges locally (no 3× count).
    onInboxCountsDelta: (deltas) => tabCounts.applyCountsDelta(deltas),
    needsReviewTotalCount: tabCounts.counts.needs_review,
  });

  useEffect(() => {
    if (filters.tab !== "needs_review" && needsReviewSearchQuery) {
      setNeedsReviewSearchQuery("");
    }
  }, [filters.tab, needsReviewSearchQuery]);

  const showNeedsReviewSearchNoResults = shouldShowNeedsReviewSearchNoResults({
    searchQuery: inboxFilters.searchQuery,
    filteredCount: inbox.designs.length,
    canSearchMore: inbox.searchHydration?.canSearchMore ?? false,
  });

  const selectedArtworkBackgroundHex = useMemo(() => {
    const draftForm = inbox.draftForm;
    const selectedDesign = inbox.selectedDesign;
    if (draftForm) {
      return resolveFormArtworkBackgroundHex({
        title: "",
        description: "",
        categoryId: "",
        tagsInput: "",
        artworkBackgroundPreset: draftForm.artworkBackgroundPreset,
        artworkBackgroundCustomHex: draftForm.artworkBackgroundCustomHex,
      });
    }
    if (selectedDesign) {
      const mapped = mapArtworkBackgroundToForm(selectedDesign);
      return resolveFormArtworkBackgroundHex({
        title: "",
        description: "",
        categoryId: "",
        tagsInput: "",
        ...mapped,
      });
    }
    return undefined;
  }, [inbox.draftForm, inbox.selectedDesign]);

  const shellHeaderConfig = useMemo(
    () => ({
      description: AI_PROCESSING_PAGE_DESCRIPTION,
      title: AI_PROCESSING_PAGE_TITLE,
    }),
    [],
  );

  useShellHeaderConfig(shellHeaderConfig);

  const hardDeleteTabAllowed =
    filters.tab === "processing" ||
    filters.tab === "needs_review" ||
    filters.tab === "rejected";

  const designsPendingHardDelete = useMemo(
    () =>
      resolveAiReviewHardDeleteTargets({
        designs: inbox.designs,
        isMultiSelectMode,
        multiSelectedIds,
        selectedDesign: inbox.selectedDesign,
      }),
    [inbox.designs, inbox.selectedDesign, isMultiSelectMode, multiSelectedIds],
  );

  const canPermanentlyDeleteSelected = Boolean(
    canDeleteEligibleUnapprovedDesigns &&
      hardDeleteTabAllowed &&
      (isMultiSelectMode
        ? designsPendingHardDelete.length > 0
        : inbox.selectedDesign &&
          isDeleteEligibleUnapprovedDesignStatus(inbox.selectedDesign.status)),
  );

  const handleCancelMultiSelect = useCallback(() => {
    const cleared = emptyAiReviewMultiSelectState();
    setIsMultiSelectMode(cleared.isMultiSelectMode);
    setMultiSelectedIds(cleared.multiSelectedIds);
    setMultiSelectAnchorId(null);
  }, []);

  const handleEnterMultiSelect = useCallback(() => {
    const seededIds = seedAiReviewMultiSelectIds(inbox.selectedDesign?.id ?? null);
    setIsMultiSelectMode(true);
    setMultiSelectedIds(seededIds);
    setMultiSelectAnchorId(seededIds[0] ?? null);
  }, [inbox.selectedDesign?.id]);

  const handleToggleMultiSelectDesign = useCallback((designId: string) => {
    setMultiSelectedIds((current) => toggleAiReviewMultiSelectId(current, designId));
    setMultiSelectAnchorId(designId);
  }, []);

  const handleRangeMultiSelectDesign = useCallback(
    (designId: string) => {
      const next = applyAiReviewMultiSelectRange({
        anchorId: multiSelectAnchorId ?? multiSelectedIds[0] ?? inbox.selectedDesign?.id ?? null,
        listIds: inbox.designs.map((design) => design.id),
        selectedIds: multiSelectedIds,
        targetId: designId,
      });
      setMultiSelectedIds(next.selectedIds);
      setMultiSelectAnchorId(next.anchorId);
    },
    [inbox.designs, inbox.selectedDesign?.id, multiSelectAnchorId, multiSelectedIds],
  );

  useEffect(() => {
    const visibleIds = new Set(inbox.designs.map((design) => design.id));
    setMultiSelectedIds((current) => {
      const next = current.filter((id) => visibleIds.has(id));
      if (next.length === current.length && next.every((id, index) => id === current[index])) {
        return current;
      }
      return next;
    });
  }, [inbox.designs]);

  useEffect(() => {
    const visibleIds = new Set(inbox.designs.map((design) => design.id));
    setMultiSelectAnchorId((current) => {
      if (current && visibleIds.has(current)) {
        return current;
      }
      return null;
    });
  }, [inbox.designs]);

  useEffect(() => {
    if (!isMultiSelectMode) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }
      if (designsToHardDelete.length > 0) {
        return;
      }
      event.preventDefault();
      handleCancelMultiSelect();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [designsToHardDelete.length, handleCancelMultiSelect, isMultiSelectMode]);

  const handleOpenPermanentDelete = useCallback(() => {
    if (!canPermanentlyDeleteSelected || designsPendingHardDelete.length === 0) {
      return;
    }
    clearHardDeleteError();
    setDesignsToHardDelete(designsPendingHardDelete);
  }, [canPermanentlyDeleteSelected, clearHardDeleteError, designsPendingHardDelete]);

  const handleConfirmPermanentDelete = useCallback(
    async (input: { confirmationPhrase: string }) => {
      if (designsToHardDelete.length === 0) {
        return;
      }

      try {
        const result = await hardDeleteDesigns({
          designIds: designsToHardDelete.map((design) => design.id),
          confirmationPhrase: input.confirmationPhrase,
        });

        const successfulIds = collectSuccessfulHardDeleteIds(result.results);
        const reconcileIds = orderHardDeleteReconcileIds({
          deletedIds: successfulIds,
          listIds: inbox.designs.map((design) => design.id),
        });

        if (successfulIds.length === 0) {
          reportHardDeleteError(resolveHardDeleteTotalFailureMessage(result.results));
          return;
        }

        setDesignsToHardDelete([]);

        for (const designId of reconcileIds) {
          inbox.reconcileAfterHardDeleteSuccess(designId);
        }

        if (isMultiSelectMode) {
          handleCancelMultiSelect();
        }
      } catch {
        // Error surfaced via hardDeleteError on the dialog.
      }
    },
    [
      designsToHardDelete,
      handleCancelMultiSelect,
      hardDeleteDesigns,
      inbox,
      isMultiSelectMode,
      reportHardDeleteError,
    ],
  );

  useAiReviewKeyboardShortcuts({
    canApprove: inbox.canApprove,
    canReject: inbox.canReject,
    isEnabled: Boolean(inbox.selectedDesign) && !isMultiSelectMode,
    isInputFocused,
    onApprove: () => void inbox.approveSelected(),
    onNext: () => inbox.selectRelative(1),
    onPrevious: () => inbox.selectRelative(-1),
    onReject: () => void inbox.rejectSelected(),
  });

  function handleTabChange(tab: AiReviewInboxTab) {
    if (tab !== filters.tab) {
      handleCancelMultiSelect();
    }
    setSearchParams(buildAiReviewInboxSearchParams({ tab, sortOrder: filters.sortOrder }), {
      replace: true,
    });
  }

  const resolvedSortOrder = resolveAiReviewInboxSortOrder(filters.tab, filters.sortOrder);

  function handleSortToggle() {
    const nextSortOrder = resolvedSortOrder === "newest" ? "oldest" : "newest";
    setSearchParams(
      buildAiReviewInboxSearchParams({ tab: filters.tab, sortOrder: nextSortOrder }),
      { replace: true },
    );
  }

  return (
    <section className="ai-review-page">
      <header className="ai-review-intro">
        <p className="ai-review-intro-copy">{getAiReviewTabDescription(filters.tab)}</p>
        {!enrichmentSettings.isLoading ? (
          <p className="ai-review-vision-model-label">
            Active vision model: <span>{enrichmentSettings.visionModelLabel}</span>
            {" · "}
            <span>
              Catalog Processing:{" "}
              {enrichmentSettings.catalogWorkflowMode === "manual"
                ? "Manual Review"
                : enrichmentSettings.catalogWorkflowMode === "shadow"
                  ? "Shadow Automation"
                  : "Autonomous"}
              {enrichmentSettings.catalogAutonomousLiveEnabled ? " (live ON)" : " (live OFF)"}
            </span>
          </p>
        ) : null}
      </header>

      {inbox.error ? (
        <AiReviewQueryErrorPanel
          message={inbox.error}
          onRetry={() => void inbox.reloadDesigns()}
        />
      ) : null}

      {taxonomyStatus === "failed" ? (
        <p className="form-error" role="alert">
          Category filters are temporarily unavailable.
        </p>
      ) : null}

      <div className="ai-review-layout" style={layoutStyle}>
        <aside className="ai-review-queue-panel">
          <AiReviewQueueStats
            counts={tabCounts.counts}
            hasMoreByTab={tabCounts.hasMoreByTab}
            isLoading={tabCounts.isLoading}
          />

          <div aria-label="Processing tabs" className="ai-review-tabs" role="tablist">
            {AI_REVIEW_INBOX_TABS.map((tab) => (
              <button
                aria-selected={filters.tab === tab.id}
                className={[
                  "ai-review-tab",
                  filters.tab === tab.id ? "ai-review-tab--active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                role="tab"
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div
            className={[
              "ai-review-queue-toolbar",
              filters.tab === "needs_review" ? "" : "ai-review-queue-toolbar--sort-only",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {filters.tab === "needs_review" ? (
              <div className="ai-review-queue-toolbar-search">
                <GlobalSearchField
                  clearable
                  onChange={setNeedsReviewSearchQuery}
                  placeholder="Search title, tags, id…"
                  value={needsReviewSearchQuery}
                />
              </div>
            ) : null}
            <AiReviewInboxSortToggle onToggle={handleSortToggle} sortOrder={resolvedSortOrder} />
          </div>

          {isMultiSelectMode ? (
            <div className="ai-review-multi-select-bar">
              <p className="ai-review-multi-select-bar-copy">
                {multiSelectedIds.length === 1
                  ? "1 selected"
                  : `${multiSelectedIds.length} selected`}
              </p>
              <div className="ai-review-multi-select-bar-actions">
                {canPermanentlyDeleteSelected ? (
                  <Button
                    onClick={handleOpenPermanentDelete}
                    size="sm"
                    type="button"
                    variant="danger"
                  >
                    Delete
                  </Button>
                ) : null}
                <Button onClick={handleCancelMultiSelect} size="sm" type="button" variant="secondary">
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}

          {filters.tab === "needs_review" && inbox.searchHydration ? (
            <div className="ai-review-search-status">
              <span>
                Found {inbox.searchHydration.foundCount} of {inbox.searchHydration.totalCount ?? "…"}
                {inbox.searchHydration.canSearchMore
                  ? ` · searched ${inbox.searchHydration.searchedCount} of ${inbox.searchHydration.totalCount ?? "…"}`
                  : null}
              </span>
              {inbox.searchHydration.canSearchMore ? (
                <Button
                  disabled={inbox.isLoadingMore}
                  onClick={inbox.searchHydration.searchMore}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  {inbox.searchHydration.isSearching ? "Searching…" : "Search more"}
                </Button>
              ) : null}
            </div>
          ) : null}

          <AiReviewQueueList
            activeTab={filters.tab}
            designs={inbox.designs}
            hasMore={inbox.hasMore}
            isLoading={inbox.isLoading}
            isLoadingMore={inbox.isLoadingMore}
            isSearchHydrating={inbox.searchHydration?.isSearching ?? false}
            listRef={inbox.queueListRef}
            onLoadMore={inbox.loadMoreDesigns}
            onSelectDesign={inbox.requestSelectDesign}
            onToggleMultiSelectDesign={handleToggleMultiSelectDesign}
            onRangeMultiSelectDesign={handleRangeMultiSelectDesign}
            isMultiSelectMode={isMultiSelectMode}
            multiSelectedIds={multiSelectedIds}
            searchActive={Boolean(inboxFilters.searchQuery?.trim())}
            selectedArtworkBackgroundHex={selectedArtworkBackgroundHex}
            selectedDesignId={inbox.selectedDesign?.id ?? null}
            showSearchNoResults={showNeedsReviewSearchNoResults}
          />
        </aside>

        <main className="ai-review-main-panel" ref={mainPanelRef}>
          <AiReviewWorkspace
            actionError={inbox.actionError}
            activeTab={inbox.activeTab}
            approvedTags={inbox.approvedTags}
            autoAdvance={inbox.processingQueue.autoAdvance}
            canApprove={inbox.canApprove}
            canApproveSuggestedTags={inbox.canApproveSuggestedTags}
            canEdit={inbox.canEdit}
            canSaveArtworkBackground={inbox.canSaveArtworkBackground}
            canManageProcessingSettings={canManageProcessingSettings}
            canStopAutoQueue={inbox.processingQueue.canStopAutoQueue}
            canProcessSelected={inbox.processingQueue.canProcessSelected}
            canArchive={inbox.canArchive}
            canEnterMultiSelect={inbox.designs.length > 0}
            canPermanentlyDelete={canPermanentlyDeleteSelected}
            canReopen={inbox.canReopen}
            canReject={inbox.canReject}
            canRerun={inbox.canRerun}
            canRetryProcessing={inbox.canRetryProcessing}
            canRetryStaleProcessing={inbox.canRetryStaleProcessing}
            canStartAutoQueue={inbox.processingQueue.canStartAutoQueue}
            categoryOptions={categoryOptions}
            currentVisionModelId={enrichmentSettings.visionModelId}
            hasProcessingSettingsOverride={inbox.processingQueue.hasSessionOverride}
            draftForm={inbox.draftForm}
            isActionLoading={inbox.isActionLoading}
            isSavingArtworkBackground={inbox.isSavingArtworkBackground}
            isSavingHalftone={inbox.isSavingHalftone}
            isAutoQueueRunning={inbox.processingQueue.isAutoQueueRunning}
            isQueueBusy={inbox.processingQueue.isQueueBusy}
            isOptimisticEnqueue={
              inbox.activeTab === "processing" &&
              Boolean(inbox.selectedDesign) &&
              inbox.processingQueue.enqueueingDesignId === inbox.selectedDesign?.id
            }
            isMultiSelectMode={isMultiSelectMode}
            ignoredSuggestedTagNames={inbox.ignoredSuggestedTagNames}
            onApprove={() => void inbox.approveSelected()}
            onApproveSuggestedTag={(sourceName, input, addToDraft) =>
              void inbox.approveSuggestedTag(sourceName, input, addToDraft)
            }
            onAutoAdvanceChange={inbox.processingQueue.setAutoAdvance}
            onInputFocusChange={setIsInputFocused}
            onIgnoreSuggestedTag={inbox.ignoreSuggestedTag}
            onNext={() => inbox.selectRelative(1)}
            onStopAutoQueue={inbox.processingQueue.stopAutoQueue}
            onPrevious={() => inbox.selectRelative(-1)}
            onProcessSelectedDesign={() => void inbox.processingQueue.processSelectedDesign()}
            onArchive={() => void inbox.archiveSelected()}
            onEnterMultiSelect={handleEnterMultiSelect}
            onPermanentlyDelete={handleOpenPermanentDelete}
            onReject={() => void inbox.rejectSelected()}
            onReopen={() => void inbox.reopenSelected()}
            onRerun={() => void inbox.rerunSelected()}
            onRetryProcessing={() => void inbox.retryProcessingSelected()}
            onRetryStaleProcessing={() => void inbox.retryStaleProcessingSelected()}
            onSaveArtworkBackground={(values) => void inbox.saveArtworkBackground(values)}
            onSaveHalftoneStaffDecision={(markAsHalftone) =>
              void inbox.saveHalftoneStaffDecision(markAsHalftone)
            }
            onApplyProcessingSettings={inbox.processingQueue.applySessionSettings}
            onClearProcessingSettings={inbox.processingQueue.clearSessionSettings}
            onStartAutoQueue={inbox.processingQueue.startAutoQueue}
            onUpdateDraftField={inbox.updateDraftField}
            isRerunningAi={inbox.isRerunningAi}
            onRerunAiSuggestions={() => inbox.requestRerunAiSuggestions()}
            queuePositionLabel={inbox.processingQueue.queuePositionLabel}
            queueRunState={inbox.processingQueue.runState}
            processingVisionModelId={inbox.processingQueue.resolvedSessionVisionModelId}
            selectedDesign={inbox.selectedDesign}
            visibleDesigns={inbox.designs}
            onSelectDesign={inbox.requestSelectDesign}
            showReadOnlySuggestions={inbox.showReadOnlySuggestions}
            reviewScrollNonce={inbox.reviewScrollNonce}
            showRerunAiButton={inbox.canRerunAiSuggestions || inbox.isRerunningAi}
          />
        </main>
      </div>

      <ConfirmLeaveDialog
        isOpen={Boolean(inbox.pendingSelection)}
        onCancel={inbox.cancelPendingSelection}
        onConfirm={inbox.confirmDiscardPendingSelection}
      />

      <ConfirmLeaveDialog
        confirmLabel="Send to Processing"
        copy="Sending this design back to Processing will clear current AI suggestions and reset unsaved review edits."
        isOpen={inbox.pendingRerun}
        onCancel={inbox.cancelPendingSelection}
        onConfirm={inbox.confirmPendingRerun}
        title="Send back to Processing?"
      />

      <DeleteEligibleUnapprovedDesignDialog
        designs={designsToHardDelete}
        error={hardDeleteError}
        isOpen={designsToHardDelete.length > 0}
        isSubmitting={isHardDeleting}
        onCancel={() => {
          clearHardDeleteError();
          setDesignsToHardDelete([]);
        }}
        onConfirm={handleConfirmPermanentDelete}
      />
    </section>
  );
}

export function AiReviewPage() {
  return (
    <AiReviewErrorBoundary>
      <AiReviewPageContent />
    </AiReviewErrorBoundary>
  );
}
