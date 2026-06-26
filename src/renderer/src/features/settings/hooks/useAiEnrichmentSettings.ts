import { useCallback, useEffect, useState } from "react";

import { formatTagsInput, tryParseTagsInput } from "../../designs/utils/designFormMapper";
import {
  DEFAULT_OPENAI_VISION_MODEL_ID,
  formatVisionModelLabel,
  resolveClientVisionModelId,
} from "../constants/aiEnrichmentSettingsConstants";
import {
  aiEnrichmentSettingsService,
  resolveClientAdditionalTagExclusions,
} from "../services/aiEnrichmentSettingsService";

interface UseAiEnrichmentSettingsResult {
  additionalTagExclusions: string[];
  effectiveTagExclusions: string[];
  error: string | null;
  isLoading: boolean;
  isSaving: boolean;
  saveError: string | null;
  saveSettings: (input: {
    visionModelId: string;
    additionalTagExclusions: string[];
  }) => Promise<void>;
  visionModelId: string;
  visionModelLabel: string;
}

export function useAiEnrichmentSettings(): UseAiEnrichmentSettingsResult {
  const [visionModelId, setVisionModelId] = useState(DEFAULT_OPENAI_VISION_MODEL_ID);
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
        setAdditionalTagExclusions(settings.additionalTagExclusions);
        setEffectiveTagExclusions(settings.effectiveTagExclusions);
        setIsLoading(false);
      },
      (message) => {
        setError(message);
        setVisionModelId(DEFAULT_OPENAI_VISION_MODEL_ID);
        setAdditionalTagExclusions([]);
        setEffectiveTagExclusions([]);
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  const saveSettings = useCallback(
    async (input: { visionModelId: string; additionalTagExclusions: string[] }) => {
      setIsSaving(true);
      setSaveError(null);

      try {
        const saved = await aiEnrichmentSettingsService.updateSettings({
          visionModelId: resolveClientVisionModelId(input.visionModelId),
          additionalTagExclusions: resolveClientAdditionalTagExclusions(input.additionalTagExclusions),
        });
        setVisionModelId(saved.visionModelId);
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
