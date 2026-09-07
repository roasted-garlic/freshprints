import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";

import type { AllowedVisionModelId } from "@fresh-prints/shared/constants/aiEnrichment.constants";
import {
  resolveCatalogAutonomousLiveEnabled,
  resolveCatalogWorkflowMode,
  type CatalogWorkflowMode,
} from "@fresh-prints/shared/constants/catalogWorkflowMode.constants";
import {
  normalizeExplicitContentAutomationTermsInput,
  resolveExplicitContentAutomationTerms,
} from "@fresh-prints/shared/utils/explicitContentAutomation";
import { auth, db } from "../../../config/firebase";
import { callTracedFunction } from "../../../config/tracedCallable";
import {
  ADDITIONAL_TAG_EXCLUSION_PATTERN,
  AI_ENRICHMENT_SETTINGS_DOC_ID,
  BASE_AI_TAG_EXCLUSIONS,
  MAX_ADDITIONAL_TAG_EXCLUSIONS,
  resolveAiEnrichmentPromptTemplate,
  resolveClientVisionModelId,
} from "../constants/aiEnrichmentSettingsConstants";
import { ensureCallableAuthReady } from "../utils/ensureCallableAuthReady";

export interface AiEnrichmentSettingsSnapshot {
  visionModelId: AllowedVisionModelId;
  /** Existing automatic Pass 2 model, exposed read-only for the owner Playground. */
  semanticReviewerModelId: AllowedVisionModelId;
  /** Owner-only manual Pass 2 experiment gate; never enables automatic Processing. */
  semanticReviewPlaygroundEnabled: boolean;
  promptTemplate: string;
  /** Historical compatibility read/preserve only; no active UI or Pass 1 path consumes this. */
  additionalTagExclusions: string[];
  catalogWorkflowMode: CatalogWorkflowMode;
  catalogAutonomousLiveEnabled: boolean;
  explicitContentAutomationTerms: string[];
  updatedBy?: string;
}

interface UpdateAiEnrichmentSettingsInput {
  visionModelId: AllowedVisionModelId;
  promptTemplate: string;
  explicitContentAutomationTerms: string[];
}

interface UpdateAiEnrichmentSettingsResult {
  visionModelId: AllowedVisionModelId;
  promptTemplate: string;
  explicitContentAutomationTerms?: string[];
}

interface UpdateSemanticReviewPlaygroundSettingResult {
  semanticReviewPlaygroundEnabled: boolean;
}

export function resolveClientAdditionalTagExclusions(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const seen = new Set<string>();
  const resolved: string[] = [];

  for (const entry of raw) {
    if (typeof entry !== "string") {
      continue;
    }

    const normalized = entry.trim().toLowerCase();

    if (
      !normalized ||
      !ADDITIONAL_TAG_EXCLUSION_PATTERN.test(normalized) ||
      seen.has(normalized) ||
      BASE_AI_TAG_EXCLUSIONS.includes(
        normalized as (typeof BASE_AI_TAG_EXCLUSIONS)[number],
      )
    ) {
      continue;
    }

    seen.add(normalized);
    resolved.push(normalized);

    if (resolved.length >= MAX_ADDITIONAL_TAG_EXCLUSIONS) {
      break;
    }
  }

  return resolved;
}

export function resolveClientPromptTemplate(raw: unknown): string {
  return resolveAiEnrichmentPromptTemplate(raw);
}

function mapSettingsSnapshot(
  data: Record<string, unknown> | undefined,
): AiEnrichmentSettingsSnapshot {
  const visionModelId = resolveClientVisionModelId(
    typeof data?.visionModelId === "string" ? data.visionModelId : undefined,
  );
  const additionalTagExclusions = resolveClientAdditionalTagExclusions(
    data?.additionalTagExclusions,
  );
  const promptTemplate = resolveClientPromptTemplate(data?.promptTemplate);

  return {
    visionModelId,
    semanticReviewerModelId: resolveClientVisionModelId(
      typeof data?.semanticReviewerModelId === "string"
        ? data.semanticReviewerModelId
        : undefined,
    ),
    semanticReviewPlaygroundEnabled:
      data?.semanticReviewPlaygroundEnabled === true,
    promptTemplate,
    additionalTagExclusions,
    catalogWorkflowMode: resolveCatalogWorkflowMode(data?.catalogWorkflowMode),
    catalogAutonomousLiveEnabled: resolveCatalogAutonomousLiveEnabled(
      data?.catalogAutonomousLiveEnabled,
    ),
    explicitContentAutomationTerms: resolveExplicitContentAutomationTerms(
      data?.explicitContentAutomationTerms,
    ),
    updatedBy: typeof data?.updatedBy === "string" ? data.updatedBy : undefined,
  };
}

export const aiEnrichmentSettingsService = {
  subscribe(
    onData: (settings: AiEnrichmentSettingsSnapshot) => void,
    onError: (message: string) => void,
  ): Unsubscribe {
    return onSnapshot(
      doc(db, "settings", AI_ENRICHMENT_SETTINGS_DOC_ID),
      (snapshot) => {
        onData(mapSettingsSnapshot(snapshot.data()));
      },
      (error) => {
        onError(error.message);
      },
    );
  },

  async updateSettings(input: {
    visionModelId: AllowedVisionModelId;
    promptTemplate: string;
    explicitContentAutomationTerms: string[];
  }): Promise<{
    visionModelId: AllowedVisionModelId;
    promptTemplate: string;
    explicitContentAutomationTerms: string[];
  }> {
    const explicitContentAutomationTerms =
      normalizeExplicitContentAutomationTermsInput(
        input.explicitContentAutomationTerms,
      );
    const response = await callTracedFunction<
      UpdateAiEnrichmentSettingsInput,
      UpdateAiEnrichmentSettingsResult
    >("updateAiEnrichmentSettings", {
      source: "aiEnrichmentSettingsService.updateSettings",
    })({
      visionModelId: resolveClientVisionModelId(input.visionModelId),
      promptTemplate: resolveClientPromptTemplate(input.promptTemplate),
      explicitContentAutomationTerms,
    });

    return {
      visionModelId: resolveClientVisionModelId(response.visionModelId),
      promptTemplate: resolveClientPromptTemplate(response.promptTemplate),
      explicitContentAutomationTerms:
        normalizeExplicitContentAutomationTermsInput(
          response.explicitContentAutomationTerms ??
            explicitContentAutomationTerms,
        ),
    };
  },

  async updateSemanticReviewPlaygroundSetting(
    enabled: boolean,
  ): Promise<boolean> {
    // Wait for Auth readiness and a current ID token before the callable so
    // Studio does not race initialization and send an empty Authorization header.
    await ensureCallableAuthReady(auth);

    const response = await callTracedFunction<
      { enabled: boolean },
      UpdateSemanticReviewPlaygroundSettingResult
    >("updateSemanticReviewPlaygroundSetting", {
      source: "aiEnrichmentSettingsService.updateSemanticReviewPlaygroundSetting",
    })({ enabled });

    return response.semanticReviewPlaygroundEnabled === true;
  },
};
