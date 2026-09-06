import { onCall } from "firebase-functions/v2/https";
import type {
  AiEnrichmentSemanticReviewPlaygroundRequest,
  AiEnrichmentSemanticReviewPlaygroundResponse,
} from "../../packages/shared/src/types/ai/aiEnrichmentPlayground.types";
import { runAiEnrichmentSemanticReviewPlayground } from "./ai/semanticReviewPlayground";
import { loadCallerProfile } from "./lib/caller";
import { invalidArgument, permissionDenied, unauthenticated } from "./lib/errors";
import { geminiApiKeySecret, openAiApiKeySecret } from "./lib/secrets";

export const testAiEnrichmentSemanticReviewPlayground = onCall(
  { secrets: [geminiApiKeySecret, openAiApiKeySecret], memory: "512MiB" },
  async (request): Promise<AiEnrichmentSemanticReviewPlaygroundResponse> => {
    if (!request.auth?.uid) throw unauthenticated();
    const caller = await loadCallerProfile(request.auth.uid);
    if (!caller.isActive || !["owner", "admin"].includes(caller.role)) {
      throw permissionDenied("Only owners and admins can use the AI playground.");
    }
    try {
      return await runAiEnrichmentSemanticReviewPlayground(
        { geminiApiKey: geminiApiKeySecret.value(), openAiApiKey: openAiApiKeySecret.value() },
        request.data as AiEnrichmentSemanticReviewPlaygroundRequest,
      );
    } catch (error) {
      throw invalidArgument(error instanceof Error ? error.message : "Unable to run semantic review playground.");
    }
  },
);
