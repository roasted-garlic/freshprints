import { callTracedFunction } from "../../../config/tracedCallable";
import { logPipelineEvent } from "../../../shared/utils/pipelineLog";
import {
  ENQUEUE_AI_ENRICHMENT_CLIENT_TIMEOUT_MS,
  resolveAiEnrichmentCallableErrorMessage,
} from "../utils/aiEnrichmentCallableErrorMessage";

interface EnqueueAiEnrichmentInput {
  designId: string;
  rerunRejected?: boolean;
  rerunFromReview?: boolean;
  visionModelIdOverride?: string;
}

interface EnqueueAiEnrichmentResult {
  aiProcessingStage?: string | null;
  aiReviewStatus?: string | null;
  completed?: boolean;
  designId: string;
  queued: boolean;
  reason?: string;
  status?: string | null;
}

interface ResetAiEnrichmentInput {
  designId: string;
}

interface ResetAiEnrichmentResult {
  aiReviewStatus: "pending";
  designId: string;
  reset: true;
  status: "imported";
}

async function enqueueAiEnrichment(
  designId: string,
  options?: {
    rerunRejected?: boolean;
    rerunFromReview?: boolean;
    visionModelIdOverride?: string;
  },
): Promise<EnqueueAiEnrichmentResult> {
  try {
    const response = await callTracedFunction<EnqueueAiEnrichmentInput, EnqueueAiEnrichmentResult>(
      "enqueueAiEnrichment",
      { source: "aiEnrichmentEnqueueService.enqueueAiEnrichment" },
      undefined,
      { timeout: ENQUEUE_AI_ENRICHMENT_CLIENT_TIMEOUT_MS },
    )({
      designId,
      rerunRejected: options?.rerunRejected,
      rerunFromReview: options?.rerunFromReview,
      visionModelIdOverride: options?.visionModelIdOverride,
    });

    logPipelineEvent("enqueue.callable.completed", {
      designId,
      queued: response.queued,
      completed: response.completed ?? null,
      aiProcessingStage: response.aiProcessingStage ?? null,
      reason: response.reason ?? null,
      rerunRejected: options?.rerunRejected ?? false,
      rerunFromReview: options?.rerunFromReview ?? false,
      visionModelIdOverride: options?.visionModelIdOverride ?? null,
    });

    return response;
  } catch (error) {
    throw new Error(resolveAiEnrichmentCallableErrorMessage(error));
  }
}

export const aiEnrichmentEnqueueService = {
  async enqueueForProcessing(
    designId: string,
    options?: { visionModelIdOverride?: string },
  ): Promise<EnqueueAiEnrichmentResult> {
    return enqueueAiEnrichment(designId, options);
  },

  /** Enqueue after import (background sequential queue; always on after successful import). */
  async enqueueAfterImport(designId: string): Promise<EnqueueAiEnrichmentResult> {
    return enqueueAiEnrichment(designId);
  },

  async retryFailedProcessing(
    designId: string,
    options?: { visionModelIdOverride?: string },
  ): Promise<EnqueueAiEnrichmentResult> {
    return enqueueAiEnrichment(designId, options);
  },

  async resetForProcessing(designId: string): Promise<ResetAiEnrichmentResult> {
    try {
      const response = await callTracedFunction<ResetAiEnrichmentInput, ResetAiEnrichmentResult>(
        "resetAiEnrichmentForProcessing",
        { source: "aiEnrichmentEnqueueService.resetForProcessing" },
      )({ designId });

      logPipelineEvent("ai.reset_for_processing.completed", {
        designId,
        reset: response.reset,
      });

      return response;
    } catch (error) {
      throw new Error(resolveAiEnrichmentCallableErrorMessage(error));
    }
  },
};
