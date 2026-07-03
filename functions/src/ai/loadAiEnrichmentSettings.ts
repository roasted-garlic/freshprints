import {
  DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
  DEFAULT_SUGGESTION_AUTHOR_MODE,
  DEFAULT_TAG_RERANK_MODE,
  SUGGESTION_AUTHOR_MODES,
  TAG_RERANK_MODES,
  resolveAiEnrichmentPromptTemplate,
  type SuggestionAuthorMode,
  type TagRerankMode,
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
  tagRerankMode: TagRerankMode;
  suggestionAuthorMode: SuggestionAuthorMode;
}

const TAG_RERANK_MODE_SET = new Set<string>(TAG_RERANK_MODES);
const SUGGESTION_AUTHOR_MODE_SET = new Set<string>(SUGGESTION_AUTHOR_MODES);

export function resolveTagRerankMode(raw: unknown): TagRerankMode {
  return typeof raw === "string" && TAG_RERANK_MODE_SET.has(raw) ? (raw as TagRerankMode) : DEFAULT_TAG_RERANK_MODE;
}

export function resolveSuggestionAuthorMode(raw: unknown): SuggestionAuthorMode {
  return typeof raw === "string" && SUGGESTION_AUTHOR_MODE_SET.has(raw)
    ? (raw as SuggestionAuthorMode)
    : DEFAULT_SUGGESTION_AUTHOR_MODE;
}

export function resolveAiPromptTemplate(raw: unknown): string {
  return resolveAiEnrichmentPromptTemplate(raw);
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
        tagRerankMode: DEFAULT_TAG_RERANK_MODE,
        suggestionAuthorMode: DEFAULT_SUGGESTION_AUTHOR_MODE,
      };
    }

    const data = snapshot.data();
    const visionModelId = resolveVisionModelId(
      typeof data?.visionModelId === "string" ? data.visionModelId : undefined,
    );
    const additionalTagExclusions = resolveAdditionalTagExclusions(data?.additionalTagExclusions);
    const promptTemplate = resolveAiPromptTemplate(data?.promptTemplate);
    const tagRerankMode = resolveTagRerankMode(data?.tagRerankMode);
    const suggestionAuthorMode = resolveSuggestionAuthorMode(data?.suggestionAuthorMode);

    return {
      visionModelId,
      promptTemplate,
      additionalTagExclusions,
      effectiveTagExclusions: mergeTagExclusions(additionalTagExclusions),
      tagRerankMode,
      suggestionAuthorMode,
    };
  } catch {
    return {
      visionModelId: DEFAULT_VISION_MODEL_ID,
      promptTemplate: DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
      additionalTagExclusions: [],
      effectiveTagExclusions: mergeTagExclusions(),
      tagRerankMode: DEFAULT_TAG_RERANK_MODE,
      suggestionAuthorMode: DEFAULT_SUGGESTION_AUTHOR_MODE,
    };
  }
}

/** @deprecated Use loadAiEnrichmentSettings(). */
export async function loadResolvedVisionModelId(): Promise<AllowedVisionModelId> {
  const settings = await loadAiEnrichmentSettings();
  return settings.visionModelId;
}
