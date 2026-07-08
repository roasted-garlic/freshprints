import {
  AI_PROCESSING_STAGES,
  type AiProcessingStage,
  type DesignAiAnalysis,
  type DesignAiSuggestions,
} from "@fresh-prints/shared/types/ai/aiProcessing.types";
import { mapFirestoreIsoString } from "../../firebase/utils/firestoreTimestamp";

function isAiProcessingStage(value: unknown): value is AiProcessingStage {
  return typeof value === "string" && AI_PROCESSING_STAGES.includes(value as AiProcessingStage);
}

function mapVisibleTextColor(value: unknown): DesignAiAnalysis["visibleTextColor"] {
  if (
    value === "black" ||
    value === "white" ||
    value === "mixed" ||
    value === "unknown"
  ) {
    return value;
  }

  return undefined;
}

function mapAiSuggestions(value: unknown): DesignAiSuggestions | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const data = value as Record<string, unknown>;

  return {
    title: typeof data.title === "string" ? data.title : undefined,
    description: typeof data.description === "string" ? data.description : undefined,
    categoryId: typeof data.categoryId === "string" ? data.categoryId : undefined,
    categoryName: typeof data.categoryName === "string" ? data.categoryName : undefined,
    tags: Array.isArray(data.tags)
      ? data.tags.filter((tag): tag is string => typeof tag === "string")
      : undefined,
    suggestedNewTags: Array.isArray(data.suggestedNewTags)
      ? data.suggestedNewTags
          .filter((tag): tag is Record<string, unknown> => Boolean(tag) && typeof tag === "object")
          .map((tag) => {
            const source = tag.source === "ai" ? "ai" as const : undefined;

            return {
              aliases: Array.isArray(tag.aliases)
                ? tag.aliases.filter((alias): alias is string => typeof alias === "string")
                : [],
              name: typeof tag.name === "string" ? tag.name : "",
              preferredWhen: typeof tag.preferredWhen === "string" ? tag.preferredWhen : "",
              reason: typeof tag.reason === "string" ? tag.reason : undefined,
              source,
            };
          })
          .filter((tag) => tag.name && tag.preferredWhen)
      : undefined,
    confidence: typeof data.confidence === "number" ? data.confidence : undefined,
    provider: typeof data.provider === "string" ? data.provider : undefined,
    model: typeof data.model === "string" ? data.model : undefined,
    promptVersion: typeof data.promptVersion === "string" ? data.promptVersion : undefined,
    generatedAt: mapFirestoreIsoString(data.generatedAt),
    errorCode: typeof data.errorCode === "string" ? data.errorCode : undefined,
    errorMessage: typeof data.errorMessage === "string" ? data.errorMessage : undefined,
    promptTokens: typeof data.promptTokens === "number" ? data.promptTokens : null,
    completionTokens: typeof data.completionTokens === "number" ? data.completionTokens : null,
    estimatedCostUsd: typeof data.estimatedCostUsd === "number" ? data.estimatedCostUsd : null,
    tagRerankStatus:
      data.tagRerankStatus === "skipped" ||
      data.tagRerankStatus === "succeeded" ||
      data.tagRerankStatus === "failed"
        ? data.tagRerankStatus
        : undefined,
    tagRerankFailureReason:
      typeof data.tagRerankFailureReason === "string" ? data.tagRerankFailureReason : undefined,
    tagRerankPromptTokens:
      typeof data.tagRerankPromptTokens === "number" ? data.tagRerankPromptTokens : null,
    tagRerankCompletionTokens:
      typeof data.tagRerankCompletionTokens === "number" ? data.tagRerankCompletionTokens : null,
    tagRerankEstimatedCostUsd:
      typeof data.tagRerankEstimatedCostUsd === "number" ? data.tagRerankEstimatedCostUsd : null,
    tagRerankPromptVersion:
      typeof data.tagRerankPromptVersion === "string" ? data.tagRerankPromptVersion : undefined,
    tagRerankUncoveredConcepts: Array.isArray(data.tagRerankUncoveredConcepts)
      ? data.tagRerankUncoveredConcepts.filter((item): item is string => typeof item === "string")
      : undefined,
  };
}

function mapAiAnalysis(value: unknown): DesignAiAnalysis | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const data = value as Record<string, unknown>;

  return {
    primarySubject: typeof data.primarySubject === "string" ? data.primarySubject : undefined,
    secondarySubjects: Array.isArray(data.secondarySubjects)
      ? data.secondarySubjects.filter((item): item is string => typeof item === "string")
      : undefined,
    theme: typeof data.theme === "string" ? data.theme : undefined,
    holiday: typeof data.holiday === "string" ? data.holiday : undefined,
    season: typeof data.season === "string" ? data.season : undefined,
    style: typeof data.style === "string" ? data.style : undefined,
    audience: typeof data.audience === "string" ? data.audience : undefined,
    colorPalette: Array.isArray(data.colorPalette)
      ? data.colorPalette.filter((item): item is string => typeof item === "string")
      : undefined,
    artworkContainsText:
      typeof data.artworkContainsText === "boolean" ? data.artworkContainsText : undefined,
    visibleText: Array.isArray(data.visibleText)
      ? data.visibleText.filter((item): item is string => typeof item === "string")
      : undefined,
    visibleTextColor: mapVisibleTextColor(data.visibleTextColor),
    textRecognitionConfidence:
      typeof data.textRecognitionConfidence === "number" ? data.textRecognitionConfidence : undefined,
    spellingConfidence:
      typeof data.spellingConfidence === "number" ? data.spellingConfidence : undefined,
    transparencyConfidence:
      typeof data.transparencyConfidence === "number" ? data.transparencyConfidence : undefined,
    estimatedPrintComplexity:
      typeof data.estimatedPrintComplexity === "string" ? data.estimatedPrintComplexity : undefined,
    trademarkWarning:
      typeof data.trademarkWarning === "string" ? data.trademarkWarning : undefined,
    overallConfidence:
      typeof data.overallConfidence === "number" ? data.overallConfidence : undefined,
  };
}

export function mapDesignAiFields(data: Record<string, unknown>): {
  aiProcessingStage?: AiProcessingStage;
  aiSuggestions?: DesignAiSuggestions;
  aiAnalysis?: DesignAiAnalysis;
} {
  return {
    aiProcessingStage: isAiProcessingStage(data.aiProcessingStage) ? data.aiProcessingStage : undefined,
    aiSuggestions: mapAiSuggestions(data.aiSuggestions),
    aiAnalysis: mapAiAnalysis(data.aiAnalysis),
  };
}
