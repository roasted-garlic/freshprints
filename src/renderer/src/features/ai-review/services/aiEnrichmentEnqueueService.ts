import { httpsCallable } from "firebase/functions";

import { functions } from "../../../config/firebase";
import { logPipelineEvent } from "../../../shared/utils/pipelineLog";

interface EnqueueAiEnrichmentInput {
  designId: string;
  rerunRejected?: boolean;
  rerunFromReview?: boolean;
}

interface EnqueueAiEnrichmentResult {
  designId: string;
  queued: boolean;
  reason?: string;
}

async function enqueueAiEnrichment(
  designId: string,
  options?: { rerunRejected?: boolean; rerunFromReview?: boolean },
): Promise<EnqueueAiEnrichmentResult> {
  const enqueueCallable = httpsCallable<EnqueueAiEnrichmentInput, EnqueueAiEnrichmentResult>(
    functions,
    "enqueueAiEnrichment",
  );

  const response = await enqueueCallable({
    designId,
    rerunRejected: options?.rerunRejected,
    rerunFromReview: options?.rerunFromReview,
  });

  logPipelineEvent("enqueue.callable.completed", {
    designId,
    queued: response.data.queued,
    reason: response.data.reason ?? null,
    rerunRejected: options?.rerunRejected ?? false,
    rerunFromReview: options?.rerunFromReview ?? false,
  });

  return response.data;
}

export const aiEnrichmentEnqueueService = {
  async enqueueForProcessing(designId: string): Promise<EnqueueAiEnrichmentResult> {
    return enqueueAiEnrichment(designId);
  },

  /** @deprecated Import no longer auto-enqueues; use enqueueForProcessing from AI Processing tab. */
  async enqueueAfterImport(designId: string): Promise<EnqueueAiEnrichmentResult> {
    return enqueueAiEnrichment(designId);
  },

  async retryFailedProcessing(designId: string): Promise<EnqueueAiEnrichmentResult> {
    return enqueueAiEnrichment(designId);
  },

  async rerunRejectedDesign(designId: string): Promise<EnqueueAiEnrichmentResult> {
    return enqueueAiEnrichment(designId, { rerunRejected: true });
  },

  async rerunFromReview(designId: string): Promise<EnqueueAiEnrichmentResult> {
    return enqueueAiEnrichment(designId, { rerunFromReview: true });
  },
};
