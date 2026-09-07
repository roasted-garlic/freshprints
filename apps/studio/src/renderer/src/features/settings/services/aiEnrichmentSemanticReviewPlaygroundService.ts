import type {
  AiEnrichmentSemanticReviewPlaygroundRequest,
  AiEnrichmentSemanticReviewPlaygroundResponse,
} from "@fresh-prints/shared/types/ai/aiEnrichmentPlayground.types";
import { callTracedFunction } from "../../../config/tracedCallable";
import { resolveAiEnrichmentCallableErrorMessage } from "../utils/aiEnrichmentCallableError";

export const aiEnrichmentSemanticReviewPlaygroundService = {
  async runReview(input: AiEnrichmentSemanticReviewPlaygroundRequest) {
    try {
      return await callTracedFunction<
        AiEnrichmentSemanticReviewPlaygroundRequest,
        AiEnrichmentSemanticReviewPlaygroundResponse
      >("testAiEnrichmentSemanticReviewPlayground", {
        source: "aiEnrichmentSemanticReviewPlaygroundService.runReview",
      })(input);
    } catch (error) {
      throw new Error(
        resolveAiEnrichmentCallableErrorMessage(error, "semanticReview"),
      );
    }
  },
};
