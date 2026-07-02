import {
  hasRequiredAiEnrichmentPromptPlaceholders,
  AI_ENRICHMENT_PROMPT_TEMPLATE_MAX_LENGTH,
  DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
} from "../../../shared/constants/aiEnrichment.constants";
import { adminDb } from "../lib/admin";
import { mergeTagExclusions, resolveAdditionalTagExclusions } from "./aiTagExclusions";
import {
  DEFAULT_VISION_MODEL_ID,
  resolveVisionModelId,
  type AllowedVisionModelId,
} from "./aiEnrichmentConfig";

export const AI_ENRICHMENT_SETTINGS_DOC_ID = "aiEnrichment";

export interface AiEnrichmentSettingsLoaded {
  visionModelId: AllowedVisionModelId;
  promptTemplate: string;
  additionalTagExclusions: string[];
  effectiveTagExclusions: string[];
}

export function resolveAiPromptTemplate(raw: unknown): string {
  if (typeof raw !== "string") {
    return DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE;
  }

  const trimmed = raw.trim();

  if (
    !trimmed ||
    trimmed.length > AI_ENRICHMENT_PROMPT_TEMPLATE_MAX_LENGTH ||
    !hasRequiredAiEnrichmentPromptPlaceholders(trimmed)
  ) {
    return DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE;
  }

  return trimmed;
}

export async function loadAiEnrichmentSettings(): Promise<AiEnrichmentSettingsLoaded> {
  try {
    const snapshot = await adminDb
      .collection("settings")
      .doc(AI_ENRICHMENT_SETTINGS_DOC_ID)
      .get();

    if (!snapshot.exists) {
      return {
        visionModelId: DEFAULT_VISION_MODEL_ID,
        promptTemplate: DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
        additionalTagExclusions: [],
        effectiveTagExclusions: mergeTagExclusions(),
      };
    }

    const data = snapshot.data();
    const visionModelId = resolveVisionModelId(
      typeof data?.visionModelId === "string" ? data.visionModelId : undefined,
    );
    const additionalTagExclusions = resolveAdditionalTagExclusions(data?.additionalTagExclusions);
    const promptTemplate = resolveAiPromptTemplate(data?.promptTemplate);

    return {
      visionModelId,
      promptTemplate,
      additionalTagExclusions,
      effectiveTagExclusions: mergeTagExclusions(additionalTagExclusions),
    };
  } catch {
    return {
      visionModelId: DEFAULT_VISION_MODEL_ID,
      promptTemplate: DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
      additionalTagExclusions: [],
      effectiveTagExclusions: mergeTagExclusions(),
    };
  }
}

/** @deprecated Use loadAiEnrichmentSettings(). */
export async function loadResolvedVisionModelId(): Promise<AllowedVisionModelId> {
  const settings = await loadAiEnrichmentSettings();
  return settings.visionModelId;
}
