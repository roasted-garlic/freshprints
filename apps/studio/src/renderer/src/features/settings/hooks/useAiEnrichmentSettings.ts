import { useCallback, useEffect, useState } from "react";

import { formatTagsInput, tryParseTagsInput } from "../../designs/utils/designFormMapper";
import {
  DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
  DEFAULT_SUGGESTED_NEW_TAGS_POLICY,
  DEFAULT_SUGGESTION_AUTHOR_MODE,
  DEFAULT_TAG_RERANK_MODE,
  DEFAULT_TAG_RERANK_PROMPT_TEMPLATE,
  DEFAULT_VISION_MODEL_ID,
  formatVisionModelLabel,
  resolveClientSuggestedNewTagsPolicy,
  resolveClientSuggestionAuthorMode,
  resolveClientTagRerankMode,
  resolveClientVisionModelId,
} from "../constants/aiEnrichmentSettingsConstants";
import type {
  AllowedVisionModelId,
  SuggestedNewTagsPolicy,
  SuggestionAuthorMode,
  TagRerankMode,
} from "@fresh-prints/shared/constants/aiEnrichment.constants";
import {
  DEFAULT_CATALOG_WORKFLOW_MODE,
  type CatalogWorkflowMode,
} from "@fresh-prints/shared/constants/catalogWorkflowMode.constants";
import {
  aiEnrichmentSettingsService,
  resolveClientAdditionalTagExclusions,
  resolveClientAiTagRerankPromptTemplate,
  resolveClientPromptTemplate,
} from "../services/aiEnrichmentSettingsService";

interface UseAiEnrichmentSettingsResult {
  additionalTagExclusions: string[];
  effectiveTagExclusions: string[];
  error: string | null;
  isLoading: boolean;
  isSaving: boolean;
  promptTemplate: string;
  tagRerankPromptTemplate: string;
  saveError: string | null;
  catalogWorkflowMode: CatalogWorkflowMode;
  catalogAutonomousLiveEnabled: boolean;
  saveSettings: (input: {
    visionModelId: string;
    promptTemplate: string;
    tagRerankPromptTemplate: string;
    additionalTagExclusions: string[];
    tagRerankMode: string;
    suggestionAuthorMode: string;
    suggestedNewTagsPolicy: string;
  }) => Promise<void>;
  suggestionAuthorMode: SuggestionAuthorMode;
  suggestedNewTagsPolicy: SuggestedNewTagsPolicy;
  tagRerankMode: TagRerankMode;
  visionModelId: string;
  visionModelLabel: string;
}

export function useAiEnrichmentSettings(): UseAiEnrichmentSettingsResult {
  const [visionModelId, setVisionModelId] = useState<AllowedVisionModelId>(DEFAULT_VISION_MODEL_ID);
  const [promptTemplate, setPromptTemplate] = useState(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE);
  const [tagRerankPromptTemplate, setTagRerankPromptTemplate] = useState(
    DEFAULT_TAG_RERANK_PROMPT_TEMPLATE,
  );
  const [additionalTagExclusions, setAdditionalTagExclusions] = useState<string[]>([]);
  const [effectiveTagExclusions, setEffectiveTagExclusions] = useState<string[]>([]);
  const [tagRerankMode, setTagRerankMode] = useState<TagRerankMode>(DEFAULT_TAG_RERANK_MODE);
  const [suggestionAuthorMode, setSuggestionAuthorMode] = useState<SuggestionAuthorMode>(
    DEFAULT_SUGGESTION_AUTHOR_MODE,
  );
  const [suggestedNewTagsPolicy, setSuggestedNewTagsPolicy] = useState<SuggestedNewTagsPolicy>(
    DEFAULT_SUGGESTED_NEW_TAGS_POLICY,
  );
  const [catalogWorkflowMode, setCatalogWorkflowMode] = useState<CatalogWorkflowMode>(
    DEFAULT_CATALOG_WORKFLOW_MODE,
  );
  const [catalogAutonomousLiveEnabled, setCatalogAutonomousLiveEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const unsubscribe = aiEnrichmentSettingsService.subscribe(
      (settings) => {
        setVisionModelId(settings.visionModelId);
        setPromptTemplate(settings.promptTemplate);
        setTagRerankPromptTemplate(settings.tagRerankPromptTemplate);
        setAdditionalTagExclusions(settings.additionalTagExclusions);
        setEffectiveTagExclusions(settings.effectiveTagExclusions);
        setTagRerankMode(settings.tagRerankMode);
        setSuggestionAuthorMode(settings.suggestionAuthorMode);
        setSuggestedNewTagsPolicy(settings.suggestedNewTagsPolicy);
        setCatalogWorkflowMode(settings.catalogWorkflowMode);
        setCatalogAutonomousLiveEnabled(settings.catalogAutonomousLiveEnabled);
        setIsLoading(false);
      },
      (message) => {
        setError(message);
        setVisionModelId(DEFAULT_VISION_MODEL_ID);
        setPromptTemplate(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE);
        setTagRerankPromptTemplate(DEFAULT_TAG_RERANK_PROMPT_TEMPLATE);
        setAdditionalTagExclusions([]);
        setEffectiveTagExclusions([]);
        setTagRerankMode(DEFAULT_TAG_RERANK_MODE);
        setSuggestionAuthorMode(DEFAULT_SUGGESTION_AUTHOR_MODE);
        setSuggestedNewTagsPolicy(DEFAULT_SUGGESTED_NEW_TAGS_POLICY);
        setCatalogWorkflowMode(DEFAULT_CATALOG_WORKFLOW_MODE);
        setCatalogAutonomousLiveEnabled(false);
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  const saveSettings = useCallback(
    async (input: {
      visionModelId: string;
      promptTemplate: string;
      tagRerankPromptTemplate: string;
      additionalTagExclusions: string[];
      tagRerankMode: string;
      suggestionAuthorMode: string;
      suggestedNewTagsPolicy: string;
    }) => {
      setIsSaving(true);
      setSaveError(null);

      try {
        const saved = await aiEnrichmentSettingsService.updateSettings({
          visionModelId: resolveClientVisionModelId(input.visionModelId),
          promptTemplate: resolveClientPromptTemplate(input.promptTemplate),
          tagRerankPromptTemplate: resolveClientAiTagRerankPromptTemplate(
            input.tagRerankPromptTemplate,
          ),
          additionalTagExclusions: resolveClientAdditionalTagExclusions(input.additionalTagExclusions),
          tagRerankMode: resolveClientTagRerankMode(input.tagRerankMode),
          suggestionAuthorMode: resolveClientSuggestionAuthorMode(input.suggestionAuthorMode),
          suggestedNewTagsPolicy: resolveClientSuggestedNewTagsPolicy(input.suggestedNewTagsPolicy),
        });
        setVisionModelId(saved.visionModelId);
        setPromptTemplate(saved.promptTemplate);
        setTagRerankPromptTemplate(saved.tagRerankPromptTemplate);
        setAdditionalTagExclusions(saved.additionalTagExclusions);
        setEffectiveTagExclusions(saved.effectiveTagExclusions);
        setTagRerankMode(saved.tagRerankMode);
        setSuggestionAuthorMode(saved.suggestionAuthorMode);
        setSuggestedNewTagsPolicy(saved.suggestedNewTagsPolicy);
      } catch (updateError) {
        setSaveError(
          updateError instanceof Error ? updateError.message : "Unable to save AI enrichment settings.",
        );
        throw updateError;
      } finally {
        setIsSaving(false);
      }
    },
    [],
  );

  return {
    additionalTagExclusions,
    effectiveTagExclusions,
    error,
    isLoading,
    isSaving,
    promptTemplate,
    tagRerankPromptTemplate,
    saveError,
    catalogWorkflowMode,
    catalogAutonomousLiveEnabled,
    saveSettings,
    suggestionAuthorMode,
    suggestedNewTagsPolicy,
    tagRerankMode,
    visionModelId,
    visionModelLabel: formatVisionModelLabel(visionModelId),
  };
}

export function formatAdditionalTagExclusionsInput(tags: string[]): string {
  return formatTagsInput(tags);
}

export function parseAdditionalTagExclusionsInput(value: string): string[] {
  return resolveClientAdditionalTagExclusions(tryParseTagsInput(value));
}
