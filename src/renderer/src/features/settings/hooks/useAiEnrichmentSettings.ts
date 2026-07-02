import { useCallback, useEffect, useState } from "react";

import { formatTagsInput, tryParseTagsInput } from "../../designs/utils/designFormMapper";
import {
  DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
  DEFAULT_VISION_MODEL_ID,
  formatVisionModelLabel,
  resolveClientVisionModelId,
} from "../constants/aiEnrichmentSettingsConstants";
import type { AllowedVisionModelId } from "../../../../../../shared/constants/aiEnrichment.constants";
import {
  aiEnrichmentSettingsService,
  resolveClientAdditionalTagExclusions,
  resolveClientPromptTemplate,
} from "../services/aiEnrichmentSettingsService";

interface UseAiEnrichmentSettingsResult {
  additionalTagExclusions: string[];
  effectiveTagExclusions: string[];
  error: string | null;
  isLoading: boolean;
  isSaving: boolean;
  promptTemplate: string;
  saveError: string | null;
  saveSettings: (input: {
    visionModelId: string;
    promptTemplate: string;
    additionalTagExclusions: string[];
  }) => Promise<void>;
  visionModelId: string;
  visionModelLabel: string;
}

export function useAiEnrichmentSettings(): UseAiEnrichmentSettingsResult {
  const [visionModelId, setVisionModelId] = useState<AllowedVisionModelId>(DEFAULT_VISION_MODEL_ID);
  const [promptTemplate, setPromptTemplate] = useState(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE);
  const [additionalTagExclusions, setAdditionalTagExclusions] = useState<string[]>([]);
  const [effectiveTagExclusions, setEffectiveTagExclusions] = useState<string[]>([]);
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
        setAdditionalTagExclusions(settings.additionalTagExclusions);
        setEffectiveTagExclusions(settings.effectiveTagExclusions);
        setIsLoading(false);
      },
      (message) => {
        setError(message);
        setVisionModelId(DEFAULT_VISION_MODEL_ID);
        setPromptTemplate(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE);
        setAdditionalTagExclusions([]);
        setEffectiveTagExclusions([]);
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  const saveSettings = useCallback(
    async (input: {
      visionModelId: string;
      promptTemplate: string;
      additionalTagExclusions: string[];
    }) => {
      setIsSaving(true);
      setSaveError(null);

      try {
        const saved = await aiEnrichmentSettingsService.updateSettings({
          visionModelId: resolveClientVisionModelId(input.visionModelId),
          promptTemplate: resolveClientPromptTemplate(input.promptTemplate),
          additionalTagExclusions: resolveClientAdditionalTagExclusions(input.additionalTagExclusions),
        });
        setVisionModelId(saved.visionModelId);
        setPromptTemplate(saved.promptTemplate);
        setAdditionalTagExclusions(saved.additionalTagExclusions);
        setEffectiveTagExclusions(saved.effectiveTagExclusions);
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
    saveError,
    saveSettings,
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
