import { adminDb } from "../lib/admin";
import { mergeTagExclusions, resolveAdditionalTagExclusions } from "./aiTagExclusions";
import {
  DEFAULT_OPENAI_VISION_MODEL_ID,
  resolveOpenAiVisionModelId,
  type AllowedOpenAiVisionModelId,
} from "./aiEnrichmentConfig";

export const AI_ENRICHMENT_SETTINGS_DOC_ID = "aiEnrichment";

export interface AiEnrichmentSettingsLoaded {
  visionModelId: AllowedOpenAiVisionModelId;
  additionalTagExclusions: string[];
  effectiveTagExclusions: string[];
}

export async function loadAiEnrichmentSettings(): Promise<AiEnrichmentSettingsLoaded> {
  try {
    const snapshot = await adminDb
      .collection("settings")
      .doc(AI_ENRICHMENT_SETTINGS_DOC_ID)
      .get();

    if (!snapshot.exists) {
      return {
        visionModelId: DEFAULT_OPENAI_VISION_MODEL_ID,
        additionalTagExclusions: [],
        effectiveTagExclusions: mergeTagExclusions(),
      };
    }

    const data = snapshot.data();
    const visionModelId = resolveOpenAiVisionModelId(
      typeof data?.visionModelId === "string" ? data.visionModelId : undefined,
    );
    const additionalTagExclusions = resolveAdditionalTagExclusions(data?.additionalTagExclusions);

    return {
      visionModelId,
      additionalTagExclusions,
      effectiveTagExclusions: mergeTagExclusions(additionalTagExclusions),
    };
  } catch {
    return {
      visionModelId: DEFAULT_OPENAI_VISION_MODEL_ID,
      additionalTagExclusions: [],
      effectiveTagExclusions: mergeTagExclusions(),
    };
  }
}

/** @deprecated Use loadAiEnrichmentSettings(). */
export async function loadResolvedVisionModelId(): Promise<AllowedOpenAiVisionModelId> {
  const settings = await loadAiEnrichmentSettings();
  return settings.visionModelId;
}
