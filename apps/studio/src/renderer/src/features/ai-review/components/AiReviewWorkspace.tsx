import { Settings } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "../../../shared/components/Button";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import { Toggle } from "../../../shared/components/Toggle";
import { DesignPreviewLightbox } from "../../designs/components/DesignPreviewLightbox";
import { DesignThumbnailPanel } from "../../designs/components/DesignThumbnailPanel";
import { useDesignDerivativeUrl } from "../../designs/hooks/useDesignDerivativeUrl";
import type { CatalogTag, CreateCatalogTagInput } from "../../designs/types/catalogTag.types";
import type { Design } from "../../designs/types/design.types";
import type { AiProcessingQueueRunState } from "../hooks/useAiProcessingQueue";
import type { AiReviewDraftForm, AiReviewInboxTab } from "../types/aiReviewInbox.types";
import { resolveAiProcessingOutputStatus } from "../utils/aiProcessingOutput";
import { filterIgnoredSuggestedTags } from "../utils/suggestedNewTags";
import { AiProcessingSettingsModal } from "./AiProcessingSettingsModal";
import { AiReviewFormPanel } from "./AiReviewFormPanel";
import { AiReviewProcessingStatusSection } from "./AiReviewProcessingStatusSection";
import { AiReviewRejectedStatusSection } from "./AiReviewRejectedStatusSection";
import { AiReviewSuggestedTagsSection } from "./AiReviewSuggestedTagsSection";
import { AiReviewSuggestionsSection } from "./AiReviewSuggestionsSection";
import { AiReviewWorkspaceEmpty } from "./AiReviewWorkspaceEmpty";

interface AiReviewWorkspaceProps {
  actionError: string | null;
  activeTab: AiReviewInboxTab;
  approvedTags: CatalogTag[];
  autoAdvance: boolean;
  canApprove: boolean;
  canApproveSuggestedTags: boolean;
  canEdit: boolean;
  canStopAutoQueue: boolean;
  canProcessSelected: boolean;
  canReopen: boolean;
  canReject: boolean;
  canRerun: boolean;
  canRetryProcessing: boolean;
  canStartAutoQueue: boolean;
  categoryOptions: { label: string; value: string }[];
  currentVisionModelId: string;
  hasProcessingSettingsOverride: boolean;
  draftForm: AiReviewDraftForm | null;
  isActionLoading: boolean;
  isAutoQueueRunning: boolean;
  isQueueBusy: boolean;
  isOptimisticEnqueue?: boolean;
  isRerunningAi: boolean;
  ignoredSuggestedTagNames: string[];
  onApprove: () => void;
  onApproveSuggestedTag: (
    sourceName: string,
    input: CreateCatalogTagInput,
    addToDraft: boolean,
  ) => Promise<void> | void;
  onAutoAdvanceChange: (enabled: boolean) => void;
  onInputFocusChange: (isFocused: boolean) => void;
  onIgnoreSuggestedTag: (name: string) => void;
  onNext: () => void;
  onPrevious: () => void;
  onProcessSelectedDesign: () => void;
  onReject: () => void;
  onReopen: () => void;
  onRerun: () => void;
  onRerunAiSuggestions: () => void;
  onRetryProcessing: () => void;
  onApplyProcessingSettings: (visionModelId: string) => void;
  onClearProcessingSettings: () => void;
  onStartAutoQueue: () => void;
  onStopAutoQueue: () => void;
  onUpdateDraftField: (field: keyof AiReviewDraftForm, value: string | boolean) => void;
  queuePositionLabel: string | null;
  queueRunState: AiProcessingQueueRunState;
  processingVisionModelId: string;
  selectedDesign: Design | null;
  showReadOnlySuggestions: boolean;
  showRerunAiButton: boolean;
}

export function AiReviewWorkspace({
  actionError,
  activeTab,
  approvedTags,
  autoAdvance,
  canApprove,
  canApproveSuggestedTags,
  canEdit,
  canStopAutoQueue,
  canProcessSelected,
  canReopen,
  canReject,
  canRerun,
  canRetryProcessing,
  canStartAutoQueue,
  categoryOptions,
  currentVisionModelId,
  hasProcessingSettingsOverride,
  draftForm,
  isActionLoading,
  isAutoQueueRunning,
  isQueueBusy,
  isOptimisticEnqueue = false,
  isRerunningAi,
  ignoredSuggestedTagNames,
  onApprove,
  onApproveSuggestedTag,
  onAutoAdvanceChange,
  onInputFocusChange,
  onIgnoreSuggestedTag,
  onNext,
  onPrevious,
  onProcessSelectedDesign,
  onReject,
  onReopen,
  onRerun,
  onRerunAiSuggestions,
  onRetryProcessing,
  onApplyProcessingSettings,
  onClearProcessingSettings,
  onStartAutoQueue,
  onStopAutoQueue,
  onUpdateDraftField,
  queuePositionLabel,
  queueRunState,
  processingVisionModelId,
  selectedDesign,
  showReadOnlySuggestions,
  showRerunAiButton,
}: AiReviewWorkspaceProps) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isProcessingSettingsOpen, setIsProcessingSettingsOpen] = useState(false);
  const previewStageRef = useRef<HTMLDivElement>(null);

  const previewPath = selectedDesign?.previewPath ?? selectedDesign?.thumbnailPath ?? "";
  const { url: previewUrl } = useDesignDerivativeUrl(previewPath || undefined);

  if (!selectedDesign) {
    return <AiReviewWorkspaceEmpty />;
  }

  const showEditableForm = activeTab === "needs_review" && draftForm;
  const showSuggestions =
    activeTab === "needs_review" || showReadOnlySuggestions;
  const suggestedNewTags = filterIgnoredSuggestedTags(
    selectedDesign.aiSuggestions?.suggestedNewTags,
    ignoredSuggestedTagNames,
  );
  const showProcessingQueueControls = activeTab === "processing" && !canRetryProcessing;
  const isAutoQueueProcessing =
    autoAdvance && (queueRunState === "running" || queueRunState === "pausing");
  const isSelectedDesignProcessing =
    resolveAiProcessingOutputStatus(selectedDesign) === "waiting";
  const showIdleProcessingHint =
    activeTab === "processing" &&
    !canRetryProcessing &&
    !canProcessSelected &&
    !canStartAutoQueue &&
    queueRunState === "idle" &&
    !isQueueBusy &&
    !isSelectedDesignProcessing;

  return (
    <div className="ai-review-workspace">
      <section aria-label="Design preview" className="ai-review-workspace-preview">
        <div className="ai-review-preview-stage" ref={previewStageRef}>
          <DesignThumbnailPanel
            alt={`Preview for ${selectedDesign.title}`}
            borderless
            catalogPath={previewPath}
            className="ai-review-preview-image"
            imageFit="contain"
            interactive
            onImageClick={() => previewUrl && setIsLightboxOpen(true)}
          />
        </div>
      </section>

      <div className="ai-review-workspace-flow">
          {activeTab === "processing" ? (
            <AiReviewProcessingStatusSection
              design={selectedDesign}
              isOptimisticEnqueue={isOptimisticEnqueue}
              queuePositionLabel={queuePositionLabel}
            />
          ) : null}

          {activeTab === "rejected" ? (
            <AiReviewRejectedStatusSection design={selectedDesign} />
          ) : null}

          {showSuggestions ? (
            <AiReviewSuggestionsSection
              design={selectedDesign}
              isRerunningAi={isRerunningAi}
              onOpenRerunModal={onRerunAiSuggestions}
              showRerunAiButton={showRerunAiButton}
            />
          ) : null}

          {activeTab === "needs_review" ? (
            <AiReviewSuggestedTagsSection
              canApproveSuggestedTags={canApproveSuggestedTags}
              isSubmitting={isActionLoading}
              onApproveSuggestedTag={onApproveSuggestedTag}
              onIgnoreSuggestedTag={onIgnoreSuggestedTag}
              suggestedNewTags={suggestedNewTags}
            />
          ) : null}

          {showEditableForm ? (
            <AiReviewFormPanel
              approvedTags={approvedTags}
              canEdit={canEdit}
              categoryOptions={categoryOptions}
              design={selectedDesign}
              draftForm={draftForm}
              onChange={onUpdateDraftField}
              onHalftoneChange={(value) => onUpdateDraftField("markAsHalftone", value)}
              onInputFocusChange={onInputFocusChange}
            />
          ) : null}

          {actionError ? (
            <p className="auth-message auth-message-error" role="alert">
              {actionError}
            </p>
          ) : null}

          <section
            aria-label="Review actions"
            className="ai-review-workspace-section ai-review-workspace-actions-section"
          >
              <div className="ai-review-workspace-actions">
                <div className="ai-review-workspace-actions-row">
                  <div className="ai-review-workspace-actions-primary">
                    {activeTab === "needs_review" ? (
                      <>
                        <Button
                          disabled={!canApprove || isActionLoading}
                          onClick={onApprove}
                          variant="success"
                        >
                          Approve &amp; Next
                        </Button>

                        <Button
                          disabled={!canReject || isActionLoading}
                          onClick={onReject}
                          variant="danger"
                        >
                          Reject &amp; Next
                        </Button>
                      </>
                    ) : null}

                    {activeTab === "rejected" ? (
                      <>
                        <Button
                          className={isRerunningAi ? "button-leading-icon" : undefined}
                          disabled={!canRerun || isActionLoading}
                          onClick={onRerun}
                          variant="primary"
                        >
                          {isRerunningAi ? (
                            <>
                              <LoadingSpinner label="Sending back to Processing" />
                              Sending…
                            </>
                          ) : (
                            "Reprocess"
                          )}
                        </Button>

                        <Button
                          disabled={!canReopen || isActionLoading}
                          onClick={onReopen}
                          variant="secondary"
                          size="sm"
                        >
                          Approve Existing Suggestions
                        </Button>
                      </>
                    ) : null}

                    {activeTab === "processing" && canRetryProcessing ? (
                      <Button
                        disabled={isActionLoading}
                        onClick={onRetryProcessing}
                        variant="warning"
                      >
                        Retry AI Processing
                      </Button>
                    ) : null}

                    {showProcessingQueueControls && autoAdvance ? (
                      <>
                        <Button
                          disabled={isAutoQueueProcessing || !canStartAutoQueue || isActionLoading}
                          onClick={onStartAutoQueue}
                          variant="primary"
                        >
                          {isAutoQueueProcessing ? "Processing…" : "Start AI"}
                        </Button>
                        <Button
                          disabled={!canStopAutoQueue}
                          onClick={onStopAutoQueue}
                          variant="secondary"
                        >
                          {queueRunState === "pausing" ? "Stopping…" : "Stop"}
                        </Button>
                      </>
                    ) : null}

                    {showProcessingQueueControls && !autoAdvance ? (
                      <Button
                        disabled={!canProcessSelected || isQueueBusy || isActionLoading}
                        onClick={onProcessSelectedDesign}
                        variant="primary"
                      >
                        Process image with AI
                      </Button>
                    ) : null}

                    {showProcessingQueueControls && autoAdvance && queueRunState === "pausing" ? (
                      <p className="ai-review-actions-hint">
                        Finishes the current image, then stops. The current request cannot be
                        cancelled mid-flight.
                      </p>
                    ) : null}

                    {showIdleProcessingHint ? (
                      <p className="ai-review-actions-hint">
                        {autoAdvance
                          ? "Use Start AI to process the queue one design at a time."
                          : "Select a design and click Process image with AI to begin."}
                      </p>
                    ) : null}
                  </div>

                  <div className="ai-review-workspace-actions-secondary">
                    <Button
                      disabled={isActionLoading}
                      onClick={onPrevious}
                      size="sm"
                      variant="secondary"
                    >
                      Previous
                    </Button>
                    <Button
                      disabled={isActionLoading}
                      onClick={onNext}
                      size="sm"
                      variant="secondary"
                    >
                      Next
                    </Button>
                  </div>
                </div>

                {activeTab === "processing" ? (
                  <div className="ai-review-auto-advance-row">
                    <div className="ai-review-auto-advance-toggle">
                      <Toggle
                        checked={autoAdvance}
                        disabled={isAutoQueueRunning || isQueueBusy}
                        label="Auto advance"
                        name="aiProcessingAutoAdvance"
                        onChange={onAutoAdvanceChange}
                      />
                    </div>
                    <button
                      aria-label="AI processing settings"
                      className={[
                        "icon-button icon-button-md icon-button-ghost ai-processing-settings-button",
                        hasProcessingSettingsOverride ? "ai-processing-settings-button--active" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      disabled={isAutoQueueRunning || isQueueBusy}
                      onClick={() => setIsProcessingSettingsOpen(true)}
                      type="button"
                    >
                      <Settings aria-hidden="true" size={18} strokeWidth={2.2} />
                    </button>
                    <p className="ai-review-shortcuts-hint ai-review-shortcuts-hint--end">
                      Shortcuts: J previous, K next
                    </p>
                  </div>
                ) : null}

                {activeTab === "needs_review" ? (
                  <div className="ai-review-shortcuts-row">
                    <p className="ai-review-shortcuts-hint">Shortcuts: A approve, R reject</p>
                    <p className="ai-review-shortcuts-hint ai-review-shortcuts-hint--end">
                      Shortcuts: J previous, K next
                    </p>
                  </div>
                ) : null}

                {activeTab === "rejected" ? (
                  <div className="ai-review-shortcuts-row">
                    <span aria-hidden="true" className="ai-review-shortcuts-row-spacer" />
                    <p className="ai-review-shortcuts-hint ai-review-shortcuts-hint--end">
                      Shortcuts: J previous, K next
                    </p>
                  </div>
                ) : null}
              </div>
          </section>
      </div>

      <DesignPreviewLightbox
        alt={`Preview for ${selectedDesign.title}`}
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        previewUrl={previewUrl}
      />

      <AiProcessingSettingsModal
        defaultVisionModelId={currentVisionModelId}
        isOpen={isProcessingSettingsOpen}
        onApply={(visionModelId) => {
          onApplyProcessingSettings(visionModelId);
          setIsProcessingSettingsOpen(false);
        }}
        onCancel={() => setIsProcessingSettingsOpen(false)}
        onUseDefaults={onClearProcessingSettings}
        visionModelId={processingVisionModelId}
      />
    </div>
  );
}
