import { useCallback, useEffect, useState } from "react";

import {
  DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
  DEFAULT_VISION_MODEL_ID,
  formatVisionModelLabel,
  resolveClientVisionModelId,
} from "../constants/aiEnrichmentSettingsConstants";
import type { AllowedVisionModelId } from "@fresh-prints/shared/constants/aiEnrichment.constants";
import { DEFAULT_EXPLICIT_CONTENT_AUTOMATION_TERMS } from "@fresh-prints/shared/constants/explicitContentAutomation.constants";
import { normalizeExplicitContentAutomationTermsInput } from "@fresh-prints/shared/utils/explicitContentAutomation";
import {
  DEFAULT_CATALOG_WORKFLOW_MODE,
  type CatalogWorkflowMode,
} from "@fresh-prints/shared/constants/catalogWorkflowMode.constants";
import {
  aiEnrichmentSettingsService,
  resolveClientAdditionalTagExclusions,
  resolveClientPromptTemplate,
} from "../services/aiEnrichmentSettingsService";

interface UseAiEnrichmentSettingsResult {
  additionalTagExclusions: string[];
  explicitContentAutomationTerms: string[];
  semanticReviewerModelId: string;
  error: string | null;
  isLoading: boolean;
  isSaving: boolean;
  promptTemplate: string;
  saveError: string | null;
  catalogWorkflowMode: CatalogWorkflowMode;
  catalogAutonomousLiveEnabled: boolean;
  saveSettings: (input: {
    visionModelId: string;
    promptTemplate: string;
    additionalTagExclusions: string[];
    explicitContentAutomationTerms: string[];
  }) => Promise<void>;
  visionModelId: string;
  visionModelLabel: string;
}

export function useAiEnrichmentSettings(): UseAiEnrichmentSettingsResult {
  const [visionModelId, setVisionModelId] = useState<AllowedVisionModelId>(
    DEFAULT_VISION_MODEL_ID,
  );
  const [promptTemplate, setPromptTemplate] = useState(
    DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
  );
  const [semanticReviewerModelId, setSemanticReviewerModelId] =
    useState<string>(DEFAULT_VISION_MODEL_ID);
  const [additionalTagExclusions, setAdditionalTagExclusions] = useState<
    string[]
  >([]);
  const [explicitContentAutomationTerms, setExplicitContentAutomationTerms] =
    useState<string[]>([...DEFAULT_EXPLICIT_CONTENT_AUTOMATION_TERMS]);
  const [catalogWorkflowMode, setCatalogWorkflowMode] =
    useState<CatalogWorkflowMode>(DEFAULT_CATALOG_WORKFLOW_MODE);
  const [catalogAutonomousLiveEnabled, setCatalogAutonomousLiveEnabled] =
    useState(false);
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
        setSemanticReviewerModelId(settings.semanticReviewerModelId);
        setPromptTemplate(settings.promptTemplate);
        setAdditionalTagExclusions(settings.additionalTagExclusions);
        setExplicitContentAutomationTerms(
          settings.explicitContentAutomationTerms,
        );
        setCatalogWorkflowMode(settings.catalogWorkflowMode);
        setCatalogAutonomousLiveEnabled(settings.catalogAutonomousLiveEnabled);
        setIsLoading(false);
      },
      (message) => {
        setError(message);
        setVisionModelId(DEFAULT_VISION_MODEL_ID);
        setSemanticReviewerModelId(DEFAULT_VISION_MODEL_ID);
        setPromptTemplate(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE);
        setAdditionalTagExclusions([]);
        setExplicitContentAutomationTerms([
          ...DEFAULT_EXPLICIT_CONTENT_AUTOMATION_TERMS,
        ]);
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
      additionalTagExclusions: string[];
      explicitContentAutomationTerms: string[];
    }) => {
      setIsSaving(true);
      setSaveError(null);

      try {
        const saved = await aiEnrichmentSettingsService.updateSettings({
          visionModelId: resolveClientVisionModelId(input.visionModelId),
          promptTemplate: resolveClientPromptTemplate(input.promptTemplate),
          additionalTagExclusions: resolveClientAdditionalTagExclusions(
            input.additionalTagExclusions,
          ),
          explicitContentAutomationTerms:
            normalizeExplicitContentAutomationTermsInput(
              input.explicitContentAutomationTerms,
            ),
        });
        setVisionModelId(saved.visionModelId);
        setPromptTemplate(saved.promptTemplate);
        setAdditionalTagExclusions(saved.additionalTagExclusions);
        setExplicitContentAutomationTerms(saved.explicitContentAutomationTerms);
      } catch (updateError) {
        setSaveError(
          updateError instanceof Error
            ? updateError.message
            : "Unable to save AI enrichment settings.",
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
    explicitContentAutomationTerms,
    semanticReviewerModelId,
    error,
    isLoading,
    isSaving,
    promptTemplate,
    saveError,
    catalogWorkflowMode,
    catalogAutonomousLiveEnabled,
    saveSettings,
    visionModelId,
    visionModelLabel: formatVisionModelLabel(visionModelId),
  };
}

export function formatExplicitContentAutomationTermsInput(
  terms: string[],
): string {
  return terms.join(", ");
}

export function parseExplicitContentAutomationTermsInput(
  value: string,
): string[] {
  // Do not use design-tag tryParseTagsInput (caps at 20) — vocabulary allows up to 200 terms.
  return normalizeExplicitContentAutomationTermsInput(
    value
      .split(",")
      .map((term) => term.trim())
      .filter(Boolean),
  );
}
