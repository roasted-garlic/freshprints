import type {
  AiEnrichmentSemanticReviewPlaygroundRequest,
  AiEnrichmentSemanticReviewPlaygroundResponse,
} from "@fresh-prints/shared/types/ai/aiEnrichmentPlayground.types";
import { callTracedFunction } from "../../../config/tracedCallable";

export const aiEnrichmentSemanticReviewPlaygroundService = {
  runReview(input: AiEnrichmentSemanticReviewPlaygroundRequest) {
    return callTracedFunction<
      AiEnrichmentSemanticReviewPlaygroundRequest,
      AiEnrichmentSemanticReviewPlaygroundResponse
    >("testAiEnrichmentSemanticReviewPlayground", {
      source: "aiEnrichmentSemanticReviewPlaygroundService.runReview",
    })(input);
  },
};
