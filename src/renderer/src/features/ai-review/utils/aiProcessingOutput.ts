import type { Design } from "../../designs/types/design.types";
import type { AiProcessingStage } from "../../../../../../shared/types/ai/aiProcessing.types";
import { formatAiReviewStatusLabel } from "../../designs/utils/aiReviewDisplay";
import { resolveDesignAiReviewDisplay } from "../../designs/utils/aiReviewState";

export type AiProcessingOutputStatus = "waiting" | "not_generated" | "failed" | "ready";

export type ProcessingPipelineStepState = "complete" | "active" | "pending" | "failed";

export interface ProcessingPipelineStep {
  id: string;
  label: string;
  state: ProcessingPipelineStepState;
}

export interface AiProcessingPipelineGroup {
  id: string;
  label: string;
  stages: readonly AiProcessingStage[];
}

export const AI_PROCESSING_UI_PIPELINE_GROUPS: readonly AiProcessingPipelineGroup[] = [
  {
    id: "sending_to_ai",
    label: "Sending to AI",
    stages: ["queued", "preparing_image", "sending_to_ai"],
  },
  {
    id: "receiving_from_ai",
    label: "Receiving from AI",
    stages: ["receiving_response", "validating_response"],
  },
  {
    id: "ready_for_review",
    label: "Ready for review",
    stages: ["ready_for_review"],
  },
] as const;

function findGroupIndexForStage(stage: AiProcessingStage | undefined): number {
  if (!stage || stage === "failed") {
    return -1;
  }

  return AI_PROCESSING_UI_PIPELINE_GROUPS.findIndex((group) => group.stages.includes(stage));
}

function resolveFailedGroupIndex(design: Design): number {
  const stage = design.aiProcessingStage;

  if (stage && stage !== "failed") {
    const groupIndex = findGroupIndexForStage(stage);
    if (groupIndex >= 0) {
      return groupIndex;
    }
  }

  const errorCode = design.aiSuggestions?.errorCode ?? "";

  if (errorCode.includes("validat")) {
    return 1;
  }

  return 0;
}

function resolveEffectiveStage(design: Design): AiProcessingStage | undefined {
  const stage = design.aiProcessingStage;

  if (stage && stage !== "failed") {
    return stage;
  }

  return undefined;
}

function resolveGroupedStepState(groupIndex: number, design: Design): ProcessingPipelineStepState {
  const outputStatus = resolveAiProcessingOutputStatus(design);

  if (outputStatus === "ready") {
    return "complete";
  }

  if (outputStatus === "not_generated") {
    return "pending";
  }

  if (outputStatus === "failed") {
    const failedGroupIndex = resolveFailedGroupIndex(design);

    if (groupIndex < failedGroupIndex) {
      return "complete";
    }

    if (groupIndex === failedGroupIndex) {
      return "failed";
    }

    return "pending";
  }

  const effectiveStage = resolveEffectiveStage(design);
  const activeGroupIndex = findGroupIndexForStage(effectiveStage);

  if (activeGroupIndex < 0) {
    return groupIndex === 0 ? "active" : "pending";
  }

  if (groupIndex < activeGroupIndex) {
    return "complete";
  }

  if (groupIndex === activeGroupIndex) {
    return "active";
  }

  return "pending";
}

export function designHasAiSuggestions(design: Design): boolean {
  const suggestions = design.aiSuggestions;

  return Boolean(
    suggestions &&
      !suggestions.errorCode &&
      (suggestions.title || suggestions.description || suggestions.tags?.length),
  );
}

export function resolveAiSuggestions(design: Design): Design["aiSuggestions"] | null {
  return design.aiSuggestions ?? null;
}

export function applyOptimisticEnqueueStage(design: Design): Design {
  return {
    ...design,
    aiProcessingStage: "queued",
  };
}

export function applyRerunOverlayStage(design: Design): Design {
  return {
    ...design,
    aiProcessed: false,
    aiProcessingStage: "queued",
    aiReviewStatus: "pending",
    aiSuggestions: undefined,
  };
}

export function getOptimisticEnqueueMessage(): string {
  // Empty on purpose: during the optimistic enqueue phase the pipeline stepper (steps 1/2/3) is
  // already shown and conveys the state on its own, so a redundant "Queuing…" caption below it
  // just adds noise. The caller skips rendering the message line when this is empty.
  return "";
}

export function resolveAiProcessingOutputStatus(design: Design): AiProcessingOutputStatus {
  if (design.aiSuggestions?.errorCode || design.aiProcessingStage === "failed") {
    return "failed";
  }

  if (designHasAiSuggestions(design) || design.aiProcessingStage === "ready_for_review") {
    return "ready";
  }

  const activeStages: AiProcessingStage[] = [
    "queued",
    "preparing_image",
    "sending_to_ai",
    "receiving_response",
    "validating_response",
  ];

  if (design.aiProcessingStage && activeStages.includes(design.aiProcessingStage)) {
    return "waiting";
  }

  if (design.status === "processing") {
    return "waiting";
  }

  const review = resolveDesignAiReviewDisplay(design);

  if (review.aiReviewStatus === "pending") {
    return "not_generated";
  }

  return "not_generated";
}

function getStageProcessingMessage(stage: AiProcessingStage | undefined): string {
  switch (stage) {
    case "queued":
    case "preparing_image":
      return "Preparing image for analysis…";
    case "sending_to_ai":
      return "Sending image to AI…";
    case "receiving_response":
      return "Analyzing artwork and generating title, description, and tags…";
    case "validating_response":
      return "Validating AI suggestions…";
    default:
      return "AI processing in progress…";
  }
}

export function getAiProcessingOutputMessage(
  status: AiProcessingOutputStatus,
  design?: Design,
  options?: { isOptimisticEnqueue?: boolean; isRerunInProgress?: boolean },
): string {
  if (options?.isRerunInProgress && status === "waiting") {
    return "Reprocessing AI suggestions…";
  }

  if (options?.isOptimisticEnqueue && status === "waiting") {
    return getOptimisticEnqueueMessage();
  }
  if (status === "failed") {
    return design?.aiSuggestions?.errorMessage ?? "AI processing failed. Complete metadata manually.";
  }

  if (status === "ready") {
    return "AI suggestions are ready for review.";
  }

  if (status === "waiting") {
    return getStageProcessingMessage(design?.aiProcessingStage);
  }

  if (status === "not_generated") {
    return "Waiting for AI.";
  }

  return "AI suggestions not yet available.";
}

export function getProcessingTabBadgeLabel(design: Design): string {
  const status = resolveAiProcessingOutputStatus(design);

  if (status === "not_generated") {
    return "Waiting for AI";
  }

  if (status === "waiting") {
    return "Processing";
  }

  return formatAiReviewStatusLabel(resolveDesignAiReviewDisplay(design).aiReviewStatus);
}

export function getQueueDesignLabel(design: Design): string {
  const suggestionTitle = design.aiSuggestions?.title?.trim();
  const title = design.title.trim();

  if (suggestionTitle) {
    return suggestionTitle;
  }

  if (title) {
    return title;
  }

  const pathSegment = design.originalPath.split("/").pop()?.trim();

  return pathSegment || "Untitled import";
}

/** Staff-facing 3-step horizontal pipeline derived from `aiProcessingStage`. */
export function resolveAiProcessingPipelineSteps(design: Design): ProcessingPipelineStep[] {
  return AI_PROCESSING_UI_PIPELINE_GROUPS.map((group, groupIndex) => ({
    id: group.id,
    label: group.label,
    state: resolveGroupedStepState(groupIndex, design),
  }));
}

/** @deprecated Use resolveAiProcessingPipelineSteps */
export function resolveProcessingPipelineSteps(design: Design): ProcessingPipelineStep[] {
  return resolveAiProcessingPipelineSteps(design);
}
