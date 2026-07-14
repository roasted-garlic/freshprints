import {
  AI_ENRICHMENT_APPROVED_CATEGORIES_PLACEHOLDER,
  AI_ENRICHMENT_APPROVED_CATEGORY_NAMES_PLACEHOLDER,
  AI_ENRICHMENT_APPROVED_TAGS_PLACEHOLDER,
  AI_ENRICHMENT_APPROVED_TAG_NAMES_PLACEHOLDER,
  AI_ENRICHMENT_EXCLUDED_TAGS_PLACEHOLDER,
  AI_ENRICHMENT_PROMPT_TEMPLATE_MAX_LENGTH,
  AI_ENRICHMENT_TAG_RERANK_PROMPT_TEMPLATE_MAX_LENGTH,
  DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
  DEFAULT_SUGGESTED_NEW_TAGS_POLICY,
  DEFAULT_SUGGESTION_AUTHOR_MODE,
  DEFAULT_TAG_RERANK_MODE,
  DEFAULT_TAG_RERANK_PROMPT_TEMPLATE,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V20,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V21,
  SUGGESTED_NEW_TAGS_POLICIES,
  SUGGESTION_AUTHOR_MODES,
  TAG_RERANK_MODES,
  hasRequiredAiEnrichmentPromptPlaceholders,
  isPreviousDefaultAiEnrichmentPromptTemplate,
  resolveAiEnrichmentPromptTemplate,
  resolveTagRerankPromptTemplate,
  DEFAULT_VISION_MODEL_ID as SHARED_DEFAULT_VISION_MODEL_ID,
  type AllowedVisionModelId,
  type SuggestedNewTagsPolicy,
  type SuggestionAuthorMode,
  type TagRerankMode,
} from "@fresh-prints/shared/constants/aiEnrichment.constants";

export {
  ADDITIONAL_TAG_EXCLUSION_PATTERN,
  BASE_AI_TAG_EXCLUSIONS,
  MAX_ADDITIONAL_TAG_EXCLUSIONS,
} from "@fresh-prints/shared/constants/aiTagExclusions.constants";

export const AI_ENRICHMENT_SETTINGS_DOC_ID = "aiEnrichment";

export const DEFAULT_VISION_MODEL_ID: AllowedVisionModelId = SHARED_DEFAULT_VISION_MODEL_ID;
export {
  AI_ENRICHMENT_APPROVED_CATEGORIES_PLACEHOLDER,
  AI_ENRICHMENT_APPROVED_CATEGORY_NAMES_PLACEHOLDER,
  AI_ENRICHMENT_APPROVED_TAGS_PLACEHOLDER,
  AI_ENRICHMENT_APPROVED_TAG_NAMES_PLACEHOLDER,
  AI_ENRICHMENT_EXCLUDED_TAGS_PLACEHOLDER,
  AI_ENRICHMENT_PROMPT_TEMPLATE_MAX_LENGTH,
  AI_ENRICHMENT_TAG_RERANK_PROMPT_TEMPLATE_MAX_LENGTH,
  DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
  DEFAULT_SUGGESTED_NEW_TAGS_POLICY,
  DEFAULT_SUGGESTION_AUTHOR_MODE,
  DEFAULT_TAG_RERANK_MODE,
  DEFAULT_TAG_RERANK_PROMPT_TEMPLATE,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V20,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V21,
  SUGGESTED_NEW_TAGS_POLICIES,
  SUGGESTION_AUTHOR_MODES,
  TAG_RERANK_MODES,
  hasRequiredAiEnrichmentPromptPlaceholders,
  isPreviousDefaultAiEnrichmentPromptTemplate,
  resolveAiEnrichmentPromptTemplate,
  resolveTagRerankPromptTemplate,
  type SuggestedNewTagsPolicy,
  type SuggestionAuthorMode,
  type TagRerankMode,
};

export function resolveClientPromptTemplate(raw: unknown): string {
  return resolveAiEnrichmentPromptTemplate(raw);
}

export function resolveClientTagRerankPromptTemplate(raw: unknown): string {
  return resolveTagRerankPromptTemplate(raw);
}

export interface TagRerankModeOption {
  value: TagRerankMode;
  label: string;
  hint: string;
}

export const TAG_RERANK_MODE_OPTIONS: readonly TagRerankModeOption[] = [
  {
    value: "off",
    label: "Off — Default",
    hint: "Never run the second-call tag reranker. Cheapest, current behavior.",
  },
  {
    value: "auto",
    label: "Auto",
    hint: "Run the reranker only when the server-side tag matcher shows signs of ambiguity. Recommended once Playground comparisons validate quality/cost.",
  },
  {
    value: "always",
    label: "Always",
    hint: "Run the reranker on every design. Temporary comparison/testing mode — not intended as a standing setting.",
  },
];

const TAG_RERANK_MODE_SET = new Set<string>(TAG_RERANK_MODES);

export function resolveClientTagRerankMode(configured?: string): TagRerankMode {
  const trimmed = configured?.trim();

  if (trimmed && TAG_RERANK_MODE_SET.has(trimmed)) {
    return trimmed as TagRerankMode;
  }

  return DEFAULT_TAG_RERANK_MODE;
}

export interface SuggestionAuthorModeOption {
  value: SuggestionAuthorMode;
  label: string;
  hint: string;
}

export const SUGGESTION_AUTHOR_MODE_OPTIONS: readonly SuggestionAuthorModeOption[] = [
  {
    value: "off",
    label: "Off — Default",
    hint: "Suggested new tags use the server-written generic template. Cheapest.",
  },
  {
    value: "auto",
    label: "Auto",
    hint: "When Suggested new tags are proposed, an AI call writes a real preferredWhen and aliases instead of the generic template.",
  },
  {
    value: "always",
    label: "Always",
    hint: "Same as Auto — writing only runs when Suggested new tags are already proposed.",
  },
];

const SUGGESTION_AUTHOR_MODE_SET = new Set<string>(SUGGESTION_AUTHOR_MODES);

export function resolveClientSuggestionAuthorMode(configured?: string): SuggestionAuthorMode {
  const trimmed = configured?.trim();

  if (trimmed && SUGGESTION_AUTHOR_MODE_SET.has(trimmed)) {
    return trimmed as SuggestionAuthorMode;
  }

  return DEFAULT_SUGGESTION_AUTHOR_MODE;
}

export interface SuggestedNewTagsPolicyOption {
  value: SuggestedNewTagsPolicy;
  label: string;
  hint: string;
}

export const SUGGESTED_NEW_TAGS_POLICY_OPTIONS: readonly SuggestedNewTagsPolicyOption[] = [
  {
    value: "off",
    label: "Off",
    hint: "Never propose Suggested New Tags. Matched approved tags only.",
  },
  {
    value: "strict",
    label: "Strict",
    hint: "Original last-resort gate: only when 0–2 approved matches, or 3 weak matches with leftovers.",
  },
  {
    value: "balanced",
    label: "Balanced — Default",
    hint: "Propose when approved matches ≤ 4 and unmatched candidates remain. Hard-cap 3 suggestions per design.",
  },
  {
    value: "generous",
    label: "Generous",
    hint: "Propose when approved matches ≤ 6 and unmatched candidates remain. Hard-cap 5 suggestions.",
  },
  {
    value: "always",
    label: "Always (testing)",
    hint: "Ignore coverage; propose whenever unmatched candidates remain. Hard-cap 5. For testing only.",
  },
];

const SUGGESTED_NEW_TAGS_POLICY_SET = new Set<string>(SUGGESTED_NEW_TAGS_POLICIES);

export function resolveClientSuggestedNewTagsPolicy(configured?: string): SuggestedNewTagsPolicy {
  const trimmed = configured?.trim();

  if (trimmed && SUGGESTED_NEW_TAGS_POLICY_SET.has(trimmed)) {
    return trimmed as SuggestedNewTagsPolicy;
  }

  return DEFAULT_SUGGESTED_NEW_TAGS_POLICY;
}

export interface VisionModelOption {
  badgeLabel: string;
  hint: string;
  label: string;
  shortLabel: string;
  value: AllowedVisionModelId;
  provider: "google";
}

export const GEMINI_VISION_MODEL_OPTIONS: readonly VisionModelOption[] = [
  {
    value: "gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash-Lite (Google) — Default",
    shortLabel: "Gemini 2.5 Flash-Lite",
    badgeLabel: "Default",
    hint: "gemini-2.5-flash-lite — fastest and most cost-effective ($0.10/$0.40 per 1M). Default.",
    provider: "google",
  },
  {
    value: "gemini-3.1-flash-lite",
    label: "Gemini 3.1 Flash-Lite (Google)",
    shortLabel: "Gemini 3.1 Flash-Lite",
    badgeLabel: "Google",
    hint: "gemini-3.1-flash-lite — newer Google model ($0.25/$1.50 per 1M).",
    provider: "google",
  },
];

export const ALL_VISION_MODEL_OPTIONS: readonly VisionModelOption[] = [
  ...GEMINI_VISION_MODEL_OPTIONS,
];

const ALLOWED_VISION_MODEL_ID_SET = new Set<string>(
  ALL_VISION_MODEL_OPTIONS.map((option) => option.value),
);

export function resolveClientVisionModelId(configured?: string): AllowedVisionModelId {
  const trimmed = configured?.trim();

  if (trimmed && ALLOWED_VISION_MODEL_ID_SET.has(trimmed)) {
    return trimmed as AllowedVisionModelId;
  }

  return DEFAULT_VISION_MODEL_ID;
}

export function getVisionModelOption(modelId: string): VisionModelOption | undefined {
  return ALL_VISION_MODEL_OPTIONS.find((option) => option.value === modelId);
}

export function formatVisionModelLabel(modelId: string): string {
  const option = getVisionModelOption(modelId);
  return option ? `${option.label} (${option.value})` : modelId;
}
