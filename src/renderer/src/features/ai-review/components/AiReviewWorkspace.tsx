import { useEffect, useRef, useState } from "react";



import { Button } from "../../../shared/components/Button";
import { Toggle } from "../../../shared/components/Toggle";

import { DesignPreviewLightbox } from "../../designs/components/DesignPreviewLightbox";

import { DesignThumbnailPanel } from "../../designs/components/DesignThumbnailPanel";

import { useDesignDerivativeUrl } from "../../designs/hooks/useDesignDerivativeUrl";

import type { Design } from "../../designs/types/design.types";

import type { AiProcessingQueueRunState } from "../hooks/useAiProcessingQueue";

import type { AiReviewDraftForm, AiReviewInboxTab } from "../types/aiReviewInbox.types";
import { resolveAiProcessingOutputStatus } from "../utils/aiProcessingOutput";
import { AiReviewFormPanel } from "./AiReviewFormPanel";

import { AiReviewProcessingStatusSection } from "./AiReviewProcessingStatusSection";

import { AiReviewRejectedStatusSection } from "./AiReviewRejectedStatusSection";

import { AiReviewSuggestionsSection } from "./AiReviewSuggestionsSection";

import { AiReviewWorkspaceEmpty } from "./AiReviewWorkspaceEmpty";



interface AiReviewWorkspaceProps {

  actionError: string | null;

  activeTab: AiReviewInboxTab;

  autoAdvance: boolean;

  canApprove: boolean;

  canEdit: boolean;

  canStopAutoQueue: boolean;

  canProcessSelected: boolean;

  canReopen: boolean;

  canReject: boolean;

  canRerun: boolean;

  canRetryProcessing: boolean;

  canStartAutoQueue: boolean;

  categoryOptions: { label: string; value: string }[];

  draftForm: AiReviewDraftForm | null;

  isActionLoading: boolean;

  isAutoQueueRunning: boolean;

  isQueueBusy: boolean;

  onApprove: () => void;

  onAutoAdvanceChange: (enabled: boolean) => void;

  onInputFocusChange: (isFocused: boolean) => void;

  onNext: () => void;

  onStopAutoQueue: () => void;

  onPrevious: () => void;

  onProcessSelectedDesign: () => void;

  onReject: () => void;

  onReopen: () => void;

  onRerun: () => void;

  onRetryProcessing: () => void;

  onStartAutoQueue: () => void;

  onUpdateDraftField: (field: keyof AiReviewDraftForm, value: string) => void;

  queuePositionLabel: string | null;

  queueRunState: AiProcessingQueueRunState;

  selectedDesign: Design | null;

  showReadOnlySuggestions: boolean;

  isRerunningAi: boolean;

  onRerunAiSuggestions: () => void;

  showRerunAiButton: boolean;

}



export function AiReviewWorkspace({

  actionError,

  activeTab,

  autoAdvance,

  canApprove,

  canEdit,

  canStopAutoQueue,

  canProcessSelected,

  canReopen,

  canReject,

  canRerun,

  canRetryProcessing,

  canStartAutoQueue,

  categoryOptions,

  draftForm,

  isActionLoading,

  isAutoQueueRunning,

  isQueueBusy,

  onApprove,

  onAutoAdvanceChange,

  onInputFocusChange,

  onNext,

  onStopAutoQueue,

  onPrevious,

  onProcessSelectedDesign,

  onReject,

  onReopen,

  onRerun,

  onRetryProcessing,

  onStartAutoQueue,

  onUpdateDraftField,

  queuePositionLabel,

  queueRunState,

  selectedDesign,

  showReadOnlySuggestions,

  isRerunningAi,

  onRerunAiSuggestions,

  showRerunAiButton,

}: AiReviewWorkspaceProps) {

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const previewStageRef = useRef<HTMLDivElement>(null);

  const previewPath = selectedDesign?.previewPath ?? selectedDesign?.thumbnailPath ?? "";

  const { url: previewUrl } = useDesignDerivativeUrl(previewPath || undefined);

  const showNeedsReviewRerunOverlay = Boolean(
    selectedDesign && activeTab === "needs_review" && isRerunningAi,
  );

  useEffect(() => {
    if (!showNeedsReviewRerunOverlay) {
      return;
    }

    previewStageRef.current?.scrollIntoView({ block: "nearest" });
  }, [showNeedsReviewRerunOverlay]);

  if (!selectedDesign) {

    return <AiReviewWorkspaceEmpty />;

  }



  const showNeedsReviewProcessingState = showNeedsReviewRerunOverlay;

  const showEditableForm =
    activeTab === "needs_review" && draftForm && !showNeedsReviewProcessingState;

  const showSuggestions =
    (activeTab === "needs_review" || showReadOnlySuggestions) && !showNeedsReviewProcessingState;

  const showProcessingQueueControls = activeTab === "processing" && !canRetryProcessing;
  const isAutoQueueProcessing =
    autoAdvance && (queueRunState === "running" || queueRunState === "pausing");
  const isSelectedDesignProcessing =
    selectedDesign !== null && resolveAiProcessingOutputStatus(selectedDesign) === "waiting";
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

            onImageClick={() => previewUrl && !showNeedsReviewRerunOverlay && setIsLightboxOpen(true)}

          />

          {showNeedsReviewRerunOverlay ? (
            <div
              aria-busy="true"
              aria-label="AI processing in progress"
              className="ai-review-preview-overlay"
              role="status"
            >
              <AiReviewProcessingStatusSection design={selectedDesign} variant="overlay" />
            </div>
          ) : null}

        </div>

      </section>



      {showNeedsReviewRerunOverlay && !actionError ? null : (
      <div className="ai-review-workspace-flow">

        {activeTab === "processing" ? (

          <AiReviewProcessingStatusSection

            design={selectedDesign}

            queuePositionLabel={queuePositionLabel}

          />

        ) : null}



        {activeTab === "rejected" ? <AiReviewRejectedStatusSection design={selectedDesign} /> : null}



        {showSuggestions ? (
          <AiReviewSuggestionsSection
            design={selectedDesign}
            isRerunningAi={isRerunningAi}
            onRerunAiSuggestions={onRerunAiSuggestions}
            showRerunAiButton={showRerunAiButton}
          />
        ) : null}



        {showEditableForm ? (

          <AiReviewFormPanel

            canEdit={canEdit}

            categoryOptions={categoryOptions}

            draftForm={draftForm}

            onChange={onUpdateDraftField}

            onInputFocusChange={onInputFocusChange}

          />

        ) : null}



        {actionError ? (

          <p className="auth-message auth-message-error" role="alert">

            {actionError}

          </p>

        ) : null}



        {!showNeedsReviewProcessingState ? (
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

                  <Button disabled={!canReject || isActionLoading} onClick={onReject} variant="danger">

                    Reject &amp; Next

                  </Button>

                </>

              ) : null}



              {activeTab === "rejected" ? (

                <>

                  <Button disabled={!canReopen || isActionLoading} onClick={onReopen} variant="primary">

                    Reopen for Review

                  </Button>

                  <Button disabled={!canRerun || isActionLoading} onClick={onRerun} variant="warning">

                    Re-run AI Suggestions

                  </Button>

                </>

              ) : null}



              {activeTab === "processing" && canRetryProcessing ? (

                <Button disabled={isActionLoading} onClick={onRetryProcessing} variant="warning">

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
                  Finishes the current image, then stops. OpenAI cannot be cancelled mid-request.
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
                <Button disabled={isActionLoading} onClick={onPrevious} size="sm" variant="secondary">
                  Previous
                </Button>
                <Button disabled={isActionLoading} onClick={onNext} size="sm" variant="secondary">
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
        ) : null}

      </div>
      )}

      <DesignPreviewLightbox

        alt={`Preview for ${selectedDesign.title}`}

        isOpen={isLightboxOpen}

        onClose={() => setIsLightboxOpen(false)}

        previewUrl={previewUrl}

      />

    </div>

  );

}


