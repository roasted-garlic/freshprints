import { onCall } from "firebase-functions/v2/https";
import type {
  AiEnrichmentSemanticReviewPlaygroundRequest,
  AiEnrichmentSemanticReviewPlaygroundResponse,
} from "../../packages/shared/src/types/ai/aiEnrichmentPlayground.types";
import { runAiEnrichmentSemanticReviewPlayground } from "./ai/semanticReviewPlayground";
import { mapSemanticReviewError } from "./ai/semanticReviewErrorMapping";
import { loadCallerProfile } from "./lib/caller";
import { permissionDenied, unauthenticated } from "./lib/errors";
import { geminiApiKeySecret, openAiApiKeySecret } from "./lib/secrets";

export const testAiEnrichmentSemanticReviewPlayground = onCall(
  { secrets: [geminiApiKeySecret, openAiApiKeySecret], memory: "512MiB" },
  async (request): Promise<AiEnrichmentSemanticReviewPlaygroundResponse> => {
    if (!request.auth?.uid) throw unauthenticated();
    const caller = await loadCallerProfile(request.auth.uid);
    if (!caller.isActive || !["owner", "admin"].includes(caller.role)) {
      throw permissionDenied("Only owners and admins can use the AI playground.");
    }
    const data = request.data as AiEnrichmentSemanticReviewPlaygroundRequest;
    if (data.captureFullTrace && caller.role !== "owner") {
      throw permissionDenied("Only owners may capture full AI trace content.");
    }
    try {
      return await runAiEnrichmentSemanticReviewPlayground(
        { geminiApiKey: geminiApiKeySecret.value(), openAiApiKey: openAiApiKeySecret.value() },
        data,
      );
    } catch (error) {
      throw mapSemanticReviewError(error);
    }
  },
);
