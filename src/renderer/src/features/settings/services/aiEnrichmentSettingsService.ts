import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

import type {
  AllowedVisionModelId,
  SuggestionAuthorMode,
  TagRerankMode,
} from "@fresh-prints/shared/constants/aiEnrichment.constants";
import { db, functions } from "../../../config/firebase";
import {
  ADDITIONAL_TAG_EXCLUSION_PATTERN,
  AI_ENRICHMENT_SETTINGS_DOC_ID,
  BASE_AI_TAG_EXCLUSIONS,
  MAX_ADDITIONAL_TAG_EXCLUSIONS,
  resolveAiEnrichmentPromptTemplate,
  resolveClientSuggestionAuthorMode,
  resolveClientTagRerankMode,
  resolveClientTagRerankPromptTemplate,
  resolveClientVisionModelId,
} from "../constants/aiEnrichmentSettingsConstants";

export interface AiEnrichmentSettingsSnapshot {
  visionModelId: AllowedVisionModelId;
  promptTemplate: string;
  tagRerankPromptTemplate: string;
  additionalTagExclusions: string[];
  effectiveTagExclusions: string[];
  tagRerankMode: TagRerankMode;
  suggestionAuthorMode: SuggestionAuthorMode;
  updatedBy?: string;
}

interface UpdateAiEnrichmentSettingsInput {
  visionModelId: AllowedVisionModelId;
  promptTemplate: string;
  tagRerankPromptTemplate: string;
  additionalTagExclusions: string[];
  tagRerankMode: TagRerankMode;
  suggestionAuthorMode: SuggestionAuthorMode;
}

interface UpdateAiEnrichmentSettingsResult {
  visionModelId: AllowedVisionModelId;
  promptTemplate: string;
  tagRerankPromptTemplate: string;
  additionalTagExclusions: string[];
  tagRerankMode: TagRerankMode;
  suggestionAuthorMode: SuggestionAuthorMode;
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
      BASE_AI_TAG_EXCLUSIONS.includes(normalized as (typeof BASE_AI_TAG_EXCLUSIONS)[number])
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

function mergeClientTagExclusions(additionalTagExclusions: string[]): string[] {
  return [...new Set([...BASE_AI_TAG_EXCLUSIONS, ...additionalTagExclusions])];
}

export function resolveClientPromptTemplate(raw: unknown): string {
  return resolveAiEnrichmentPromptTemplate(raw);
}

export function resolveClientAiTagRerankPromptTemplate(raw: unknown): string {
  return resolveClientTagRerankPromptTemplate(raw);
}

function mapSettingsSnapshot(data: Record<string, unknown> | undefined): AiEnrichmentSettingsSnapshot {
  const visionModelId = resolveClientVisionModelId(
    typeof data?.visionModelId === "string" ? data.visionModelId : undefined,
  );
  const additionalTagExclusions = resolveClientAdditionalTagExclusions(data?.additionalTagExclusions);
  const promptTemplate = resolveClientPromptTemplate(data?.promptTemplate);
  const tagRerankPromptTemplate = resolveClientAiTagRerankPromptTemplate(data?.tagRerankPromptTemplate);
  const tagRerankMode = resolveClientTagRerankMode(
    typeof data?.tagRerankMode === "string" ? data.tagRerankMode : undefined,
  );
  const suggestionAuthorMode = resolveClientSuggestionAuthorMode(
    typeof data?.suggestionAuthorMode === "string" ? data.suggestionAuthorMode : undefined,
  );

  return {
    visionModelId,
    promptTemplate,
    tagRerankPromptTemplate,
    additionalTagExclusions,
    effectiveTagExclusions: mergeClientTagExclusions(additionalTagExclusions),
    tagRerankMode,
    suggestionAuthorMode,
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
    tagRerankPromptTemplate: string;
    additionalTagExclusions: string[];
    tagRerankMode: TagRerankMode;
    suggestionAuthorMode: SuggestionAuthorMode;
  }): Promise<AiEnrichmentSettingsSnapshot> {
    const updateCallable = httpsCallable<
      UpdateAiEnrichmentSettingsInput,
      UpdateAiEnrichmentSettingsResult
    >(functions, "updateAiEnrichmentSettings");

    const response = await updateCallable({
      visionModelId: resolveClientVisionModelId(input.visionModelId),
      promptTemplate: resolveClientPromptTemplate(input.promptTemplate),
      tagRerankPromptTemplate: resolveClientAiTagRerankPromptTemplate(input.tagRerankPromptTemplate),
      additionalTagExclusions: resolveClientAdditionalTagExclusions(input.additionalTagExclusions),
      tagRerankMode: resolveClientTagRerankMode(input.tagRerankMode),
      suggestionAuthorMode: resolveClientSuggestionAuthorMode(input.suggestionAuthorMode),
    });

    return {
      visionModelId: resolveClientVisionModelId(response.data.visionModelId),
      promptTemplate: resolveClientPromptTemplate(response.data.promptTemplate),
      tagRerankPromptTemplate: resolveClientAiTagRerankPromptTemplate(
        response.data.tagRerankPromptTemplate,
      ),
      additionalTagExclusions: resolveClientAdditionalTagExclusions(
        response.data.additionalTagExclusions,
      ),
      effectiveTagExclusions: mergeClientTagExclusions(
        resolveClientAdditionalTagExclusions(response.data.additionalTagExclusions),
      ),
      tagRerankMode: resolveClientTagRerankMode(response.data.tagRerankMode),
      suggestionAuthorMode: resolveClientSuggestionAuthorMode(response.data.suggestionAuthorMode),
    };
  },
};
