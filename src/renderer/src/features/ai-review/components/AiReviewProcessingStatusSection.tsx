import { Check, LoaderCircle, X } from "lucide-react";

import type { Design } from "../../designs/types/design.types";
import {
  formatAiEstimatedCost,
  formatTagRerankStatusLabel,
  resolveCombinedAiEstimatedCost,
} from "../../designs/utils/aiReviewDisplay";
import {
  applyOptimisticEnqueueStage,
  applyRerunOverlayStage,
  getAiProcessingOutputMessage,
  resolveAiProcessingOutputStatus,
  resolveAiProcessingPipelineSteps,
  type ProcessingPipelineStep,
} from "../utils/aiProcessingOutput";

interface AiReviewProcessingStatusSectionProps {
  design: Design;
  isOptimisticEnqueue?: boolean;
  isRerunInProgress?: boolean;
  queuePositionLabel?: string | null;
  variant?: "default" | "overlay";
}

function StepperNodeIcon({ step, stepNumber }: { step: ProcessingPipelineStep; stepNumber: number }) {
  if (step.state === "complete") {
    return (
      <Check aria-hidden="true" className="ai-review-pipeline-stepper-icon" size={18} strokeWidth={2.5} />
    );
  }

  if (step.state === "failed") {
    return <X aria-hidden="true" className="ai-review-pipeline-stepper-icon" size={18} strokeWidth={2.5} />;
  }

  if (step.state === "active") {
    return (
      <LoaderCircle
        aria-hidden="true"
        className="ai-review-pipeline-stepper-icon ai-review-pipeline-stepper-icon--active"
        size={18}
        strokeWidth={2.5}
      />
    );
  }

  return <span className="ai-review-pipeline-stepper-number">{stepNumber}</span>;
}

export function AiReviewProcessingStatusSection({
  design,
  isOptimisticEnqueue = false,
  isRerunInProgress = false,
  queuePositionLabel,
  variant = "default",
}: AiReviewProcessingStatusSectionProps) {
  const showActivePipeline = isOptimisticEnqueue || isRerunInProgress;
  const displayDesign = showActivePipeline
    ? isRerunInProgress
      ? applyRerunOverlayStage(design)
      : applyOptimisticEnqueueStage(design)
    : design;
  const steps = resolveAiProcessingPipelineSteps(displayDesign);
  const outputStatus = showActivePipeline ? "waiting" : resolveAiProcessingOutputStatus(design);
  const statusMessage = getAiProcessingOutputMessage(outputStatus, displayDesign, {
    isOptimisticEnqueue,
    isRerunInProgress,
  });
  const errorMessage =
    outputStatus === "failed" ? design.aiSuggestions?.errorMessage?.trim() : undefined;
  const isOverlay = variant === "overlay";

  return (
    <section
      aria-label="Processing status"
      className={[
        "ai-review-workspace-section",
        isOverlay ? "ai-review-processing-status-section--overlay" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {!isOverlay ? (
        <div className="ai-review-workspace-section-header">
          <h3 className="ai-review-workspace-section-title">Processing Status</h3>
          {queuePositionLabel ? (
            <div className="ai-review-processing-status-meta">
              <span className="ai-review-queue-position">{queuePositionLabel}</span>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="ai-review-workspace-section-header ai-review-workspace-section-header--overlay">
          <h3 className="ai-review-workspace-section-title">Reprocessing</h3>
        </div>
      )}

      {outputStatus === "not_generated" && !showActivePipeline ? (
        <p className="ai-review-processing-idle-copy">{statusMessage}</p>
      ) : outputStatus === "not_generated" ? null : (
        <ol className="ai-review-pipeline-stepper" role="list">
          {steps.map((step, index) => (
            <li
              aria-current={step.state === "active" ? "step" : undefined}
              className={[
                "ai-review-pipeline-stepper-item",
                `ai-review-pipeline-stepper-item--${step.state}`,
              ].join(" ")}
              key={step.id}
            >
              <div className="ai-review-pipeline-stepper-track">
                <div className="ai-review-pipeline-stepper-node">
                  <StepperNodeIcon step={step} stepNumber={index + 1} />
                </div>
                {index < steps.length - 1 ? (
                  <div
                    aria-hidden="true"
                    className={[
                      "ai-review-pipeline-stepper-connector",
                      step.state === "complete" ? "ai-review-pipeline-stepper-connector--complete" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  />
                ) : null}
              </div>
              <span className="ai-review-pipeline-stepper-label">{step.label}</span>
            </li>
          ))}
        </ol>
      )}

      {outputStatus === "waiting" && statusMessage ? (
        <p className="ai-review-processing-idle-copy">{statusMessage}</p>
      ) : null}

      {outputStatus === "ready" && !showActivePipeline ? (
        <dl className="ai-review-processing-run-meta">
          {design.aiSuggestions?.model ? (
            <div>
              <dt>Model</dt>
              <dd>{design.aiSuggestions.model}</dd>
            </div>
          ) : null}
          {design.aiSuggestions?.provider ? (
            <div>
              <dt>Provider</dt>
              <dd>{design.aiSuggestions.provider}</dd>
            </div>
          ) : null}
          {design.aiSuggestions?.promptTokens != null ||
          design.aiSuggestions?.completionTokens != null ? (
            <div>
              <dt>Input / Output tokens</dt>
              <dd>
                {design.aiSuggestions?.promptTokens ?? "—"} /{" "}
                {design.aiSuggestions?.completionTokens ?? "—"}
              </dd>
            </div>
          ) : null}
          {design.aiSuggestions?.estimatedCostUsd != null ? (
            <div>
              <dt>Est. cost</dt>
              <dd>${design.aiSuggestions.estimatedCostUsd.toFixed(6)}</dd>
            </div>
          ) : null}
          {design.aiSuggestions?.tagRerankStatus && design.aiSuggestions.tagRerankStatus !== "skipped" ? (
            <>
              <div>
                <dt>Tag rerank</dt>
                <dd>{formatTagRerankStatusLabel(design.aiSuggestions.tagRerankStatus)}</dd>
              </div>
              {design.aiSuggestions.tagRerankEstimatedCostUsd != null ? (
                <div>
                  <dt>Tag rerank cost</dt>
                  <dd>{formatAiEstimatedCost(design.aiSuggestions.tagRerankEstimatedCostUsd)}</dd>
                </div>
              ) : null}
              <div>
                <dt>Combined cost</dt>
                <dd>
                  {formatAiEstimatedCost(
                    resolveCombinedAiEstimatedCost(
                      design.aiSuggestions?.estimatedCostUsd,
                      design.aiSuggestions.tagRerankEstimatedCostUsd,
                    ),
                  )}
                </dd>
              </div>
            </>
          ) : null}
        </dl>
      ) : null}

      {errorMessage ? (
        <p className="ai-review-pipeline-error auth-message auth-message-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}
