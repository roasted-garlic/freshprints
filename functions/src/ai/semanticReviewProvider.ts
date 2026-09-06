import { estimateVisionCostUsd } from "../../../packages/shared/src/constants/aiEnrichment.constants";
import type { SemanticReviewResult } from "../../../packages/shared/src/types/catalog/semanticReview.types";
import { extractJsonObject as parseJson } from "./simpleCatalogEnrichmentResponse";
import { fetchVisionWithRetry } from "./visionRequestRetry";
import type { ProviderTarget } from "./providers/resolveProviderTarget";
import { CATALOG_SEMANTIC_REVIEW_PROMPT_VERSION } from "../../../packages/shared/src/types/catalog/semanticReview.types";
import { parseSemanticReviewResult } from "./semanticReviewCore";

type AssistantContent = string | Array<{ type?: string; text?: string }>;

export function extractSemanticReviewContent(payload: unknown): string {
  const choices = (payload as { choices?: Array<{ message?: { content?: AssistantContent } }> } | null)?.choices;
  const content = choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const text = content.filter((part) => part?.type === "text" && typeof part.text === "string").map((part) => part.text).join("");
    if (text) return text;
  }
  throw new Error("Semantic reviewer returned no content.");
}


export async function callSemanticReviewer(input: {
  apiKey: string;
  providerTarget: ProviderTarget;
  modelId: string;
  prompt: string;
  designId: string;
}): Promise<{ result: SemanticReviewResult; promptTokens: number | null; completionTokens: number | null; estimatedCostUsd: number | null; provider: string; model: string; promptVersion: string }> {
  const response = await fetchVisionWithRetry(input.providerTarget.baseUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${input.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: input.modelId, max_completion_tokens: 1200, messages: [
      { role: "system", content: "You are a text-only semantic catalog reviewer. Return JSON only." },
      { role: "user", content: input.prompt },
    ] }),
  }, { modelId: input.modelId, maxRetries: 1 });
  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: AssistantContent } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } };
  const content = extractSemanticReviewContent(payload);
  const raw = parseJson(content);
  const result = parseSemanticReviewResult(raw);
  const promptTokens = typeof payload.usage?.prompt_tokens === "number" ? payload.usage.prompt_tokens : null;
  const completionTokens = typeof payload.usage?.completion_tokens === "number" ? payload.usage.completion_tokens : null;
  return { result, promptTokens, completionTokens, estimatedCostUsd: promptTokens != null && completionTokens != null ? estimateVisionCostUsd(input.modelId, promptTokens, completionTokens) : null, provider: input.providerTarget.providerId, model: input.modelId, promptVersion: CATALOG_SEMANTIC_REVIEW_PROMPT_VERSION };
}
