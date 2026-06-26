import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

import { db, functions } from "../../../config/firebase";
import {
  ADDITIONAL_TAG_EXCLUSION_PATTERN,
  AI_ENRICHMENT_SETTINGS_DOC_ID,
  BASE_AI_TAG_EXCLUSIONS,
  MAX_ADDITIONAL_TAG_EXCLUSIONS,
  resolveClientVisionModelId,
} from "../constants/aiEnrichmentSettingsConstants";

export interface AiEnrichmentSettingsSnapshot {
  visionModelId: string;
  additionalTagExclusions: string[];
  effectiveTagExclusions: string[];
  updatedBy?: string;
}

interface UpdateAiEnrichmentSettingsInput {
  visionModelId: string;
  additionalTagExclusions: string[];
}

interface UpdateAiEnrichmentSettingsResult {
  visionModelId: string;
  additionalTagExclusions: string[];
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

function mapSettingsSnapshot(data: Record<string, unknown> | undefined): AiEnrichmentSettingsSnapshot {
  const visionModelId = resolveClientVisionModelId(
    typeof data?.visionModelId === "string" ? data.visionModelId : undefined,
  );
  const additionalTagExclusions = resolveClientAdditionalTagExclusions(data?.additionalTagExclusions);

  return {
    visionModelId,
    additionalTagExclusions,
    effectiveTagExclusions: mergeClientTagExclusions(additionalTagExclusions),
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
    visionModelId: string;
    additionalTagExclusions: string[];
  }): Promise<AiEnrichmentSettingsSnapshot> {
    const updateCallable = httpsCallable<
      UpdateAiEnrichmentSettingsInput,
      UpdateAiEnrichmentSettingsResult
    >(functions, "updateAiEnrichmentSettings");

    const response = await updateCallable({
      visionModelId: resolveClientVisionModelId(input.visionModelId),
      additionalTagExclusions: resolveClientAdditionalTagExclusions(input.additionalTagExclusions),
    });

    return {
      visionModelId: resolveClientVisionModelId(response.data.visionModelId),
      additionalTagExclusions: resolveClientAdditionalTagExclusions(
        response.data.additionalTagExclusions,
      ),
      effectiveTagExclusions: mergeClientTagExclusions(
        resolveClientAdditionalTagExclusions(response.data.additionalTagExclusions),
      ),
    };
  },
};
