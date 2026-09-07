import {
  DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
  resolveAiEnrichmentPromptTemplate,
} from "../../../packages/shared/src/constants/aiEnrichment.constants";
import {
  resolveCatalogAutonomousLiveEnabled,
  resolveCatalogWorkflowMode,
  type CatalogWorkflowMode,
} from "../../../packages/shared/src/constants/catalogWorkflowMode.constants";
import { resolveExplicitContentAutomationTerms } from "../../../packages/shared/src/utils/explicitContentAutomation";
import { adminDb } from "../lib/admin";
import { resolveAdditionalTagExclusions } from "./aiTagExclusions";
import {
  DEFAULT_VISION_MODEL_ID,
  resolveVisionModelId,
  type AllowedVisionModelId,
} from "./aiEnrichmentConfig";

export const AI_ENRICHMENT_SETTINGS_DOC_ID = "aiEnrichment";

export function resolveSemanticReviewPlaygroundEnabled(raw: unknown): boolean {
  return raw === true;
}

export interface AiEnrichmentSettingsLoaded {
  visionModelId: AllowedVisionModelId;
  promptTemplate: string;
  additionalTagExclusions: string[];
  /** Owner-only manual Pass 2 experiment gate. Never controls Processing. */
  semanticReviewPlaygroundEnabled: boolean;
  /** @deprecated Retained for compatibility reads; no active Processing authority. */
  semanticReviewerEnabled: boolean;
  semanticReviewerModelId: AllowedVisionModelId;
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

function defaultSettingsPayload(
  settingsReadFailed: boolean,
): AiEnrichmentSettingsLoaded {
  return {
    visionModelId: DEFAULT_VISION_MODEL_ID,
    promptTemplate: DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
    additionalTagExclusions: [],
    semanticReviewPlaygroundEnabled: false,
    semanticReviewerEnabled: false,
    semanticReviewerModelId: "gemini-2.5-flash-lite",
    catalogWorkflowMode: resolveCatalogWorkflowMode(undefined),
    catalogAutonomousLiveEnabled:
      resolveCatalogAutonomousLiveEnabled(undefined),
    explicitContentAutomationTerms:
      resolveExplicitContentAutomationTerms(undefined),
    settingsReadFailed,
  };
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
      return defaultSettingsPayload(false);
    }

    const data = snapshot.data();
    const visionModelId = resolveVisionModelId(
      typeof data?.visionModelId === "string" ? data.visionModelId : undefined,
    );
    const additionalTagExclusions = resolveAdditionalTagExclusions(
      data?.additionalTagExclusions,
    );
    const promptTemplate = resolveAiPromptTemplate(data?.promptTemplate);
    const explicitContentAutomationTerms =
      resolveExplicitContentAutomationTerms(
        data?.explicitContentAutomationTerms,
      );

    return {
      visionModelId,
      promptTemplate,
      additionalTagExclusions,
      semanticReviewPlaygroundEnabled: resolveSemanticReviewPlaygroundEnabled(
        data?.semanticReviewPlaygroundEnabled,
      ),
      semanticReviewerEnabled: data?.semanticReviewerEnabled === true,
      semanticReviewerModelId: resolveVisionModelId(
        typeof data?.semanticReviewerModelId === "string"
          ? data.semanticReviewerModelId
          : "gemini-2.5-flash-lite",
      ),
      catalogWorkflowMode: resolveCatalogWorkflowMode(
        data?.catalogWorkflowMode,
      ),
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
