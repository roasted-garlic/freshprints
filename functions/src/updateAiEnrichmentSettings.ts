import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import {
  AI_ENRICHMENT_EXCLUDED_TAGS_PLACEHOLDER,
  AI_ENRICHMENT_PROMPT_TEMPLATE_MAX_LENGTH,
  DEFAULT_SUGGESTION_AUTHOR_MODE,
  DEFAULT_TAG_RERANK_MODE,
  SUGGESTION_AUTHOR_MODES,
  TAG_RERANK_MODES,
  hasRequiredAiEnrichmentPromptPlaceholders,
  type SuggestionAuthorMode,
  type TagRerankMode,
} from "../../shared/constants/aiEnrichment.constants";
import { loadCallerProfile } from "./lib/caller";
import { adminDb } from "./lib/admin";
import { invalidArgument, permissionDenied, unauthenticated } from "./lib/errors";
import { resolveVisionModelId, type AllowedVisionModelId } from "./ai/aiEnrichmentConfig";
import { AI_ENRICHMENT_SETTINGS_DOC_ID } from "./ai/loadAiEnrichmentSettings";
import { resolveAdditionalTagExclusions } from "./ai/aiTagExclusions";
import { clearAiEnrichmentRuntimeCache } from "./ai/aiEnrichmentRuntimeCache";
import { logPipelineEvent } from "./lib/pipelineLog";

const TAG_RERANK_MODE_SET = new Set<string>(TAG_RERANK_MODES);
const SUGGESTION_AUTHOR_MODE_SET = new Set<string>(SUGGESTION_AUTHOR_MODES);

interface UpdateAiEnrichmentSettingsRequest {
  visionModelId: string;
  promptTemplate: string;
  additionalTagExclusions?: string[];
  tagRerankMode?: TagRerankMode;
  suggestionAuthorMode?: SuggestionAuthorMode;
}

interface UpdateAiEnrichmentSettingsResponse {
  visionModelId: AllowedVisionModelId;
  promptTemplate: string;
  additionalTagExclusions: string[];
  tagRerankMode: TagRerankMode;
  suggestionAuthorMode: SuggestionAuthorMode;
}

function assertOwnerAdminCaller(caller: Awaited<ReturnType<typeof loadCallerProfile>>): void {
  if (!caller.isActive || !["owner", "admin"].includes(caller.role)) {
    throw permissionDenied("Only owners and admins can update AI enrichment settings.");
  }
}

function validateRequest(data: unknown): UpdateAiEnrichmentSettingsRequest {
  if (!data || typeof data !== "object") {
    throw invalidArgument("Request data is required.");
  }

  const visionModelId =
    "visionModelId" in data && typeof data.visionModelId === "string" ? data.visionModelId.trim() : "";

  if (!visionModelId) {
    throw invalidArgument("A vision model ID is required.");
  }

  const promptTemplate =
    "promptTemplate" in data && typeof data.promptTemplate === "string"
      ? data.promptTemplate.trim()
      : "";

  if (!promptTemplate) {
    throw invalidArgument("An AI processing prompt is required.");
  }

  if (promptTemplate.length > AI_ENRICHMENT_PROMPT_TEMPLATE_MAX_LENGTH) {
    throw invalidArgument("The AI processing prompt is too long.");
  }

  if (!hasRequiredAiEnrichmentPromptPlaceholders(promptTemplate)) {
    throw invalidArgument(
      `The AI processing prompt must include ${AI_ENRICHMENT_EXCLUDED_TAGS_PLACEHOLDER}.`,
    );
  }

  const additionalTagExclusions =
    "additionalTagExclusions" in data ? data.additionalTagExclusions : undefined;

  if (
    additionalTagExclusions !== undefined &&
    additionalTagExclusions !== null &&
    !Array.isArray(additionalTagExclusions)
  ) {
    throw invalidArgument("Additional tag exclusions must be an array of strings.");
  }

  const tagRerankMode = "tagRerankMode" in data ? data.tagRerankMode : undefined;

  if (tagRerankMode !== undefined && (typeof tagRerankMode !== "string" || !TAG_RERANK_MODE_SET.has(tagRerankMode))) {
    throw invalidArgument(`tagRerankMode must be one of: ${TAG_RERANK_MODES.join(", ")}.`);
  }

  const suggestionAuthorMode = "suggestionAuthorMode" in data ? data.suggestionAuthorMode : undefined;

  if (
    suggestionAuthorMode !== undefined &&
    (typeof suggestionAuthorMode !== "string" || !SUGGESTION_AUTHOR_MODE_SET.has(suggestionAuthorMode))
  ) {
    throw invalidArgument(`suggestionAuthorMode must be one of: ${SUGGESTION_AUTHOR_MODES.join(", ")}.`);
  }

  return {
    visionModelId,
    promptTemplate,
    additionalTagExclusions: Array.isArray(additionalTagExclusions)
      ? additionalTagExclusions
      : undefined,
    tagRerankMode: typeof tagRerankMode === "string" ? (tagRerankMode as TagRerankMode) : undefined,
    suggestionAuthorMode:
      typeof suggestionAuthorMode === "string" ? (suggestionAuthorMode as SuggestionAuthorMode) : undefined,
  };
}

export const updateAiEnrichmentSettings = onCall(
  async (request): Promise<UpdateAiEnrichmentSettingsResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    const caller = await loadCallerProfile(request.auth.uid);
    assertOwnerAdminCaller(caller);

    const {
      visionModelId: requestedModelId,
      promptTemplate,
      additionalTagExclusions,
      tagRerankMode: requestedTagRerankMode,
      suggestionAuthorMode: requestedSuggestionAuthorMode,
    } = validateRequest(request.data);
    const resolvedModelId = resolveVisionModelId(requestedModelId);

    if (resolvedModelId !== requestedModelId) {
      throw invalidArgument("The selected vision model is not allowed.");
    }

    const resolvedAdditionalTagExclusions = resolveAdditionalTagExclusions(additionalTagExclusions);
    const resolvedTagRerankMode: TagRerankMode = requestedTagRerankMode ?? DEFAULT_TAG_RERANK_MODE;
    const resolvedSuggestionAuthorMode: SuggestionAuthorMode =
      requestedSuggestionAuthorMode ?? DEFAULT_SUGGESTION_AUTHOR_MODE;

    await adminDb.collection("settings").doc(AI_ENRICHMENT_SETTINGS_DOC_ID).set(
      {
        visionModelId: resolvedModelId,
        promptTemplate,
        additionalTagExclusions: resolvedAdditionalTagExclusions,
        tagRerankMode: resolvedTagRerankMode,
        suggestionAuthorMode: resolvedSuggestionAuthorMode,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: request.auth.uid,
      },
      { merge: true },
    );

    clearAiEnrichmentRuntimeCache();

    logPipelineEvent("settings.ai_enrichment.updated", {
      visionModelId: resolvedModelId,
      promptTemplate,
      additionalTagExclusionsCount: resolvedAdditionalTagExclusions.length,
      tagRerankMode: resolvedTagRerankMode,
      suggestionAuthorMode: resolvedSuggestionAuthorMode,
      updatedBy: request.auth.uid,
    });

    return {
      visionModelId: resolvedModelId,
      promptTemplate,
      additionalTagExclusions: resolvedAdditionalTagExclusions,
      tagRerankMode: resolvedTagRerankMode,
      suggestionAuthorMode: resolvedSuggestionAuthorMode,
    };
  },
);
