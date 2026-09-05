import {
  DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
  DEFAULT_SUGGESTED_NEW_TAGS_POLICY,
  DEFAULT_SUGGESTION_AUTHOR_MODE,
  DEFAULT_TAG_RERANK_MODE,
  DEFAULT_TAG_RERANK_PROMPT_TEMPLATE,
  SUGGESTION_AUTHOR_MODES,
  TAG_RERANK_MODES,
  resolveAiEnrichmentPromptTemplate,
  resolveTagRerankPromptTemplate,
  type SuggestedNewTagsPolicy,
  type SuggestionAuthorMode,
  type TagRerankMode,
} from "../../../packages/shared/src/constants/aiEnrichment.constants";
import {
  resolveCatalogAutonomousLiveEnabled,
  resolveCatalogWorkflowMode,
  type CatalogWorkflowMode,
} from "../../../packages/shared/src/constants/catalogWorkflowMode.constants";
import { resolveSuggestedNewTagsPolicy } from "../../../packages/shared/src/utils/suggestedNewTagsPolicy";
import { resolveExplicitContentAutomationTerms } from "../../../packages/shared/src/utils/explicitContentAutomation";
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
  tagRerankPromptTemplate: string;
  additionalTagExclusions: string[];
  effectiveTagExclusions: string[];
  tagRerankMode: TagRerankMode;
  suggestionAuthorMode: SuggestionAuthorMode;
  suggestedNewTagsPolicy: SuggestedNewTagsPolicy;
  catalogWorkflowMode: CatalogWorkflowMode;
  catalogAutonomousLiveEnabled: boolean;
  /**
   * Owner Explicit Content Automation vocabulary.
   * Absent Firestore field → code defaults. Intentional `[]` → empty (no hidden fallback).
   */
  explicitContentAutomationTerms: string[];
  /**
   * True when Firestore settings read threw. Callers that would otherwise auto-approve must
   * fail closed to Needs Review (classification capability unavailable).
   */
  settingsReadFailed: boolean;
}

const TAG_RERANK_MODE_SET = new Set<string>(TAG_RERANK_MODES);
const SUGGESTION_AUTHOR_MODE_SET = new Set<string>(SUGGESTION_AUTHOR_MODES);

function defaultSettingsPayload(settingsReadFailed: boolean): AiEnrichmentSettingsLoaded {
  return {
    visionModelId: DEFAULT_VISION_MODEL_ID,
    promptTemplate: DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
    tagRerankPromptTemplate: DEFAULT_TAG_RERANK_PROMPT_TEMPLATE,
    additionalTagExclusions: [],
    effectiveTagExclusions: mergeTagExclusions(),
    tagRerankMode: DEFAULT_TAG_RERANK_MODE,
    suggestionAuthorMode: DEFAULT_SUGGESTION_AUTHOR_MODE,
    suggestedNewTagsPolicy: DEFAULT_SUGGESTED_NEW_TAGS_POLICY,
    catalogWorkflowMode: resolveCatalogWorkflowMode(undefined),
    catalogAutonomousLiveEnabled: resolveCatalogAutonomousLiveEnabled(undefined),
    explicitContentAutomationTerms: resolveExplicitContentAutomationTerms(undefined),
    settingsReadFailed,
  };
}

export function resolveTagRerankMode(raw: unknown): TagRerankMode {
  return typeof raw === "string" && TAG_RERANK_MODE_SET.has(raw) ? (raw as TagRerankMode) : DEFAULT_TAG_RERANK_MODE;
}

export function resolveSuggestionAuthorMode(raw: unknown): SuggestionAuthorMode {
  return typeof raw === "string" && SUGGESTION_AUTHOR_MODE_SET.has(raw)
    ? (raw as SuggestionAuthorMode)
    : DEFAULT_SUGGESTION_AUTHOR_MODE;
}

export function resolveSuggestedNewTagsPolicySetting(raw: unknown): SuggestedNewTagsPolicy {
  return resolveSuggestedNewTagsPolicy(raw);
}

export function resolveAiPromptTemplate(raw: unknown): string {
  return resolveAiEnrichmentPromptTemplate(raw);
}

export function resolveAiTagRerankPromptTemplate(raw: unknown): string {
  return resolveTagRerankPromptTemplate(raw);
}

export async function loadAiEnrichmentSettings(): Promise<AiEnrichmentSettingsLoaded> {
  try {
    const snapshot = await adminDb
      .collection("settings")
      .doc(AI_ENRICHMENT_SETTINGS_DOC_ID)
      .get();

    if (!snapshot.exists) {
      return defaultSettingsPayload(false);
    }

    const data = snapshot.data();
    const visionModelId = resolveVisionModelId(
      typeof data?.visionModelId === "string" ? data.visionModelId : undefined,
    );
    const additionalTagExclusions = resolveAdditionalTagExclusions(data?.additionalTagExclusions);
    const promptTemplate = resolveAiPromptTemplate(data?.promptTemplate);
    const tagRerankPromptTemplate = resolveAiTagRerankPromptTemplate(data?.tagRerankPromptTemplate);
    const tagRerankMode = resolveTagRerankMode(data?.tagRerankMode);
    const suggestionAuthorMode = resolveSuggestionAuthorMode(data?.suggestionAuthorMode);
    const suggestedNewTagsPolicy = resolveSuggestedNewTagsPolicySetting(data?.suggestedNewTagsPolicy);
    const explicitContentAutomationTerms = resolveExplicitContentAutomationTerms(
      data?.explicitContentAutomationTerms,
    );

    return {
      visionModelId,
      promptTemplate,
      tagRerankPromptTemplate,
      additionalTagExclusions,
      effectiveTagExclusions: mergeTagExclusions(additionalTagExclusions),
      tagRerankMode,
      suggestionAuthorMode,
      suggestedNewTagsPolicy,
      catalogWorkflowMode: resolveCatalogWorkflowMode(data?.catalogWorkflowMode),
      catalogAutonomousLiveEnabled: resolveCatalogAutonomousLiveEnabled(
        data?.catalogAutonomousLiveEnabled,
      ),
      explicitContentAutomationTerms,
      settingsReadFailed: false,
    };
  } catch {
    return defaultSettingsPayload(true);
  }
}

/** @deprecated Use loadAiEnrichmentSettings(). */
export async function loadResolvedVisionModelId(): Promise<AllowedVisionModelId> {
  const settings = await loadAiEnrichmentSettings();
  return settings.visionModelId;
}
