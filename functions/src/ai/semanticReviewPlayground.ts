import type {
  AiEnrichmentSemanticReviewPlaygroundRequest,
  AiEnrichmentSemanticReviewPlaygroundResponse,
} from "../../../packages/shared/src/types/ai/aiEnrichmentPlayground.types";
import { buildSemanticReviewPrompt } from "./semanticReviewCore";
import { callSemanticReviewer } from "./semanticReviewProvider";
import { resolveProviderTarget } from "./providers/resolveProviderTarget";

export async function runAiEnrichmentSemanticReviewPlayground(
  keys: { geminiApiKey: string; openAiApiKey?: string },
  request: AiEnrichmentSemanticReviewPlaygroundRequest,
): Promise<AiEnrichmentSemanticReviewPlaygroundResponse> {
  const target = resolveProviderTarget(request.visionModelId.startsWith("gpt-") ? "openai" : "google");
  const apiKey = target.providerId === "openai" ? keys.openAiApiKey ?? "" : keys.geminiApiKey;
  if (!apiKey) throw new Error(`No API key configured for ${target.providerId}.`);
  const result = await callSemanticReviewer({
    apiKey,
    providerTarget: target,
    modelId: request.visionModelId,
    designId: "playground",
    prompt: buildSemanticReviewPrompt(request),
    currentSmartProfile: request.effectiveSmartProfile,
  });
  return { ...result, provider: result.provider as AiEnrichmentSemanticReviewPlaygroundResponse["provider"] };
}
