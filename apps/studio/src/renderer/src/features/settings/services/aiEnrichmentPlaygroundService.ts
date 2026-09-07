import type {
  AiEnrichmentPlaygroundRequest,
  AiEnrichmentPlaygroundResponse,
} from "@fresh-prints/shared/types/ai/aiEnrichmentPlayground.types";
import { callTracedFunction } from "../../../config/tracedCallable";
import { resolveClientVisionModelId } from "../constants/aiEnrichmentSettingsConstants";
import { resolveAiEnrichmentCallableErrorMessage } from "../utils/aiEnrichmentCallableError";

export const aiEnrichmentPlaygroundService = {
  async runPlayground(
    input: AiEnrichmentPlaygroundRequest,
  ): Promise<AiEnrichmentPlaygroundResponse> {
    try {
      return await callTracedFunction<
        AiEnrichmentPlaygroundRequest,
        AiEnrichmentPlaygroundResponse
      >("testAiEnrichmentPlayground", {
        source: "aiEnrichmentPlaygroundService.runPlayground",
      })({
        ...input,
        visionModelId: resolveClientVisionModelId(input.visionModelId),
      });
    } catch (error) {
      throw new Error(
        resolveAiEnrichmentCallableErrorMessage(error, "playground"),
      );
    }
  },
};
