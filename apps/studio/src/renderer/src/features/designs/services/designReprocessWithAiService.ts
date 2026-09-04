import { callTracedFunction } from "../../../config/tracedCallable";
import { permissionService } from "../../permissions/services/permissionService";
import type { User } from "../../users/types/user.types";
import {
  ENQUEUE_AI_ENRICHMENT_CLIENT_TIMEOUT_MS,
  resolveAiEnrichmentCallableErrorMessage,
} from "../../ai-review/utils/aiEnrichmentCallableErrorMessage";

export interface ReprocessReadyDesignWithAiResult {
  designId: string;
  demoted: true;
  status: string;
  aiReviewStatus: string | null;
  aiProcessingStage: string | null;
  readyAtPreserved: boolean;
}

export const designReprocessWithAiService = {
  async reprocessReadyDesignWithAi(
    caller: User,
    designId: string,
  ): Promise<ReprocessReadyDesignWithAiResult> {
    if (!permissionService.canReprocessReadyDesignWithAi(caller)) {
      throw new Error("Only the owner can reprocess Ready designs with AI.");
    }

    const trimmedId = designId.trim();
    if (!trimmedId) {
      throw new Error("A design ID is required.");
    }

    try {
      return await callTracedFunction<
        { designId: string },
        ReprocessReadyDesignWithAiResult
      >(
        "reprocessReadyDesignWithAi",
        { source: "designReprocessWithAiService.reprocessReadyDesignWithAi" },
        undefined,
        { timeout: ENQUEUE_AI_ENRICHMENT_CLIENT_TIMEOUT_MS },
      )({ designId: trimmedId });
    } catch (error) {
      throw new Error(resolveAiEnrichmentCallableErrorMessage(error));
    }
  },
};
