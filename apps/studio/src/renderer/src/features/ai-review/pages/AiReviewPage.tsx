import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { ConfirmLeaveDialog } from "../../../shared/components/ConfirmLeaveDialog";
import type { SelectOption } from "../../../shared/components/Select";
import { useShellHeaderConfig } from "../../../shared/hooks/useShellHeaderConfig";
import { useGeneratedDesignLibraryTaxonomy } from "../../designs/hooks/useGeneratedDesignLibraryTaxonomy";
import {
  AI_PROCESSING_PAGE_DESCRIPTION,
  AI_PROCESSING_PAGE_TITLE,
  AI_REVIEW_INBOX_TABS,
  buildAiReviewInboxSearchParams,
  getAiReviewTabDescription,
  parseAiReviewInboxFilters,
} from "../constants/aiReviewInboxConstants";
import { AiReviewErrorBoundary } from "../components/AiReviewErrorBoundary";
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
import type { AiReviewInboxTab } from "../types/aiReviewInbox.types";

function AiReviewPageContent() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isInputFocused, setIsInputFocused] = useState(false);
  const filters = useMemo(() => parseAiReviewInboxFilters(searchParams), [searchParams]);
  const canManageProcessingSettings = permissionService.canManageSettings(user);

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
      setSearchParams(buildAiReviewInboxSearchParams({ tab }), { replace: true });
    },
    [setSearchParams],
  );

  const inbox = useAiReviewInbox(filters, {
    defaultVisionModelId: enrichmentSettings.visionModelId,
    onNavigateToTab: handleNavigateToTab,
    // Processing / background queue still refreshes authoritative counts.
    onQueueChanged: () => void tabCounts.reloadCounts(),
    // Amendment 9 P0: successful approve/reject/archive adjust badges locally (no 3× count).
    onInboxCountsDelta: (deltas) => tabCounts.applyCountsDelta(deltas),
  });

  const shellHeaderConfig = useMemo(
    () => ({
      description: AI_PROCESSING_PAGE_DESCRIPTION,
      title: AI_PROCESSING_PAGE_TITLE,
    }),
    [],
  );

  useShellHeaderConfig(shellHeaderConfig);

  useAiReviewKeyboardShortcuts({
    canApprove: inbox.canApprove,
    canReject: inbox.canReject,
    isEnabled: Boolean(inbox.selectedDesign),
    isInputFocused,
    onApprove: () => void inbox.approveSelected(),
    onNext: () => inbox.selectRelative(1),
    onPrevious: () => inbox.selectRelative(-1),
    onReject: () => void inbox.rejectSelected(),
  });

  function handleTabChange(tab: AiReviewInboxTab) {
    setSearchParams(buildAiReviewInboxSearchParams({ tab }), { replace: true });
  }

  return (
    <section className="ai-review-page">
      <header className="ai-review-intro">
        <p className="ai-review-intro-copy">{getAiReviewTabDescription(filters.tab)}</p>
        {!enrichmentSettings.isLoading ? (
          <p className="ai-review-vision-model-label">
            Active vision model: <span>{enrichmentSettings.visionModelLabel}</span>
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

          <AiReviewQueueList
            activeTab={filters.tab}
            designs={inbox.designs}
            hasMore={inbox.hasMore}
            isLoading={inbox.isLoading}
            isLoadingMore={inbox.isLoadingMore}
            listRef={inbox.queueListRef}
            onLoadMore={inbox.loadMoreDesigns}
            onSelectDesign={inbox.requestSelectDesign}
            selectedDesignId={inbox.selectedDesign?.id ?? null}
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
            canReopen={inbox.canReopen}
            canReject={inbox.canReject}
            canRerun={inbox.canRerun}
            canRetryProcessing={inbox.canRetryProcessing}
            canStartAutoQueue={inbox.processingQueue.canStartAutoQueue}
            categoryOptions={categoryOptions}
            currentVisionModelId={enrichmentSettings.visionModelId}
            hasProcessingSettingsOverride={inbox.processingQueue.hasSessionOverride}
            draftForm={inbox.draftForm}
            isActionLoading={inbox.isActionLoading}
            isSavingArtworkBackground={inbox.isSavingArtworkBackground}
            isAutoQueueRunning={inbox.processingQueue.isAutoQueueRunning}
            isQueueBusy={inbox.processingQueue.isQueueBusy}
            isOptimisticEnqueue={
              inbox.activeTab === "processing" &&
              Boolean(inbox.selectedDesign) &&
              inbox.processingQueue.enqueueingDesignId === inbox.selectedDesign?.id
            }
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
            onReject={() => void inbox.rejectSelected()}
            onReopen={() => void inbox.reopenSelected()}
            onRerun={() => void inbox.rerunSelected()}
            onRetryProcessing={() => void inbox.retryProcessingSelected()}
            onSaveArtworkBackground={(values) => void inbox.saveArtworkBackground(values)}
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
            showReadOnlySuggestions={inbox.showReadOnlySuggestions}
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
