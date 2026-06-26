import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import type { SelectOption } from "../../../shared/components/Select";
import { useShellHeaderConfig } from "../../../shared/hooks/useShellHeaderConfig";
import { useCategories } from "../../designs/hooks/useCategories";
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
import { AiReviewUnsavedDialog } from "../components/AiReviewUnsavedDialog";
import { AiReviewWorkspace } from "../components/AiReviewWorkspace";
import { useAiReviewInbox } from "../hooks/useAiReviewInbox";
import { useAiReviewKeyboardShortcuts } from "../hooks/useAiReviewKeyboardShortcuts";
import { useAiReviewTabCounts } from "../hooks/useAiReviewTabCounts";
import { useAiEnrichmentSettings } from "../../settings/hooks/useAiEnrichmentSettings";
import type { AiReviewInboxTab } from "../types/aiReviewInbox.types";

function AiReviewPageContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);
  const filters = useMemo(() => parseAiReviewInboxFilters(searchParams), [searchParams]);
  const wasInboxLoadingRef = useRef(true);

  const { categories } = useCategories();

  const categoryOptions = useMemo<SelectOption[]>(
    () =>
      categories
        .filter((category) => category.isActive)
        .map((category) => ({ label: category.name, value: category.id })),
    [categories],
  );

  const tabCounts = useAiReviewTabCounts(statsRefreshKey);
  const enrichmentSettings = useAiEnrichmentSettings();

  const inbox = useAiReviewInbox(filters, {
    onQueueChanged: () => void tabCounts.reloadCounts(),
  });

  const shellHeaderConfig = useMemo(
    () => ({
      description: AI_PROCESSING_PAGE_DESCRIPTION,
      title: AI_PROCESSING_PAGE_TITLE,
    }),
    [],
  );

  useShellHeaderConfig(shellHeaderConfig);

  useEffect(() => {
    if (wasInboxLoadingRef.current && !inbox.isLoading) {
      setStatsRefreshKey((currentKey) => currentKey + 1);
    }

    wasInboxLoadingRef.current = inbox.isLoading;
  }, [inbox.isLoading]);

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

      <div className="ai-review-layout">
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

        <main className="ai-review-main-panel">
          <AiReviewWorkspace
            actionError={inbox.actionError}
            activeTab={inbox.activeTab}
            autoAdvance={inbox.processingQueue.autoAdvance}
            canApprove={inbox.canApprove}
            canEdit={inbox.canEdit}
            canStopAutoQueue={inbox.processingQueue.canStopAutoQueue}
            canProcessSelected={inbox.processingQueue.canProcessSelected}
            canReopen={inbox.canReopen}
            canReject={inbox.canReject}
            canRerun={inbox.canRerun}
            canRetryProcessing={inbox.canRetryProcessing}
            canStartAutoQueue={inbox.processingQueue.canStartAutoQueue}
            categoryOptions={categoryOptions}
            draftForm={inbox.draftForm}
            isActionLoading={inbox.isActionLoading}
            isAutoQueueRunning={inbox.processingQueue.isAutoQueueRunning}
            isQueueBusy={inbox.processingQueue.isQueueBusy}
            onApprove={() => void inbox.approveSelected()}
            onAutoAdvanceChange={inbox.processingQueue.setAutoAdvance}
            onInputFocusChange={setIsInputFocused}
            onNext={() => inbox.selectRelative(1)}
            onStopAutoQueue={inbox.processingQueue.stopAutoQueue}
            onPrevious={() => inbox.selectRelative(-1)}
            onProcessSelectedDesign={() => void inbox.processingQueue.processSelectedDesign()}
            onReject={() => void inbox.rejectSelected()}
            onReopen={() => void inbox.reopenSelected()}
            onRerun={() => void inbox.rerunSelected()}
            onRetryProcessing={() => void inbox.retryProcessingSelected()}
            onStartAutoQueue={inbox.processingQueue.startAutoQueue}
            onUpdateDraftField={inbox.updateDraftField}
            isRerunningAi={inbox.isRerunningAi}
            onRerunAiSuggestions={() => inbox.requestRerunAiSuggestions()}
            queuePositionLabel={inbox.processingQueue.queuePositionLabel}
            queueRunState={inbox.processingQueue.runState}
            selectedDesign={inbox.selectedDesign}
            showReadOnlySuggestions={inbox.showReadOnlySuggestions}
            showRerunAiButton={inbox.canRerunAiSuggestions || inbox.isRerunningAi}
          />
        </main>
      </div>

      <AiReviewUnsavedDialog
        isOpen={Boolean(inbox.pendingSelection)}
        onCancel={inbox.cancelPendingSelection}
        onConfirm={inbox.confirmDiscardPendingSelection}
      />

      <AiReviewUnsavedDialog
        confirmLabel="Re-run AI"
        copy="Re-running AI will replace current suggestions and reset unsaved review edits."
        isOpen={inbox.pendingRerun}
        onCancel={inbox.cancelPendingSelection}
        onConfirm={inbox.confirmPendingRerun}
        title="Re-run AI suggestions?"
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
