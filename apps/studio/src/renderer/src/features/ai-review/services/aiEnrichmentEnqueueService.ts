import { FirebaseError } from "firebase/app";
import { httpsCallable } from "firebase/functions";

import { functions } from "../../../config/firebase";
import { logPipelineEvent } from "../../../shared/utils/pipelineLog";

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
    const enqueueCallable = httpsCallable<EnqueueAiEnrichmentInput, EnqueueAiEnrichmentResult>(
      functions,
      "enqueueAiEnrichment",
    );

    const response = await enqueueCallable({
      designId,
      rerunRejected: options?.rerunRejected,
      rerunFromReview: options?.rerunFromReview,
      visionModelIdOverride: options?.visionModelIdOverride,
    });

    logPipelineEvent("enqueue.callable.completed", {
      designId,
      queued: response.data.queued,
      completed: response.data.completed ?? null,
      aiProcessingStage: response.data.aiProcessingStage ?? null,
      reason: response.data.reason ?? null,
      rerunRejected: options?.rerunRejected ?? false,
      rerunFromReview: options?.rerunFromReview ?? false,
      visionModelIdOverride: options?.visionModelIdOverride ?? null,
    });

    return response.data;
  } catch (error) {
    throw new Error(resolveAiEnrichmentCallableErrorMessage(error));
  }
}

function resolveAiEnrichmentCallableErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    const message = error.message?.trim() ?? "";

    switch (error.code) {
      case "functions/unauthenticated":
        return "You must be signed in to run AI processing.";
      case "functions/permission-denied":
        return message && !isGenericCallableMessage(message)
          ? message
          : "You do not have permission to run AI processing.";
      case "functions/invalid-argument":
      case "functions/failed-precondition":
        return message && !isGenericCallableMessage(message)
          ? message
          : "AI processing could not start for this design.";
      case "functions/unavailable":
      case "functions/not-found":
      case "functions/internal":
        return "AI Processing is unavailable right now. Confirm Cloud Functions are deployed for the selected Firebase project.";
      default:
        if (message && !isGenericCallableMessage(message)) {
          return message;
        }
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return "Unable to run AI processing right now.";
}

function isGenericCallableMessage(message: string): boolean {
  return new Set([
    "internal",
    "unknown",
    "unavailable",
    "failed-precondition",
    "invalid-argument",
    "permission-denied",
    "not-found",
  ]).has(message.trim().toLowerCase());
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
      const resetCallable = httpsCallable<ResetAiEnrichmentInput, ResetAiEnrichmentResult>(
        functions,
        "resetAiEnrichmentForProcessing",
      );

      const response = await resetCallable({ designId });

      logPipelineEvent("ai.reset_for_processing.completed", {
        designId,
        reset: response.data.reset,
      });

      return response.data;
    } catch (error) {
      throw new Error(resolveAiEnrichmentCallableErrorMessage(error));
    }
  },
};
