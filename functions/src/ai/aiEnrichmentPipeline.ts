import { FieldValue } from "firebase-admin/firestore";

import type { DesignAiAnalysis, DesignAiSuggestions } from "../../../packages/shared/src/types/ai/aiProcessing.types";
import type { SuggestedNewTag } from "../../../packages/shared/src/types/catalogTag.types";
import type { SuggestionAuthorMode, TagRerankMode } from "../../../packages/shared/src/constants/aiEnrichment.constants";
import { adminDb, adminStorage } from "../lib/admin";
import { updateAiProcessingStage } from "./designAiFields";
import { logPipelineEvent } from "../lib/pipelineLog";
import { resolveVisionErrorCode } from "./visionRequestRetry";
import { prepareAiAnalysisImage } from "./prepareAiAnalysisImage";
import {
  loadCachedActiveCategories,
  loadCachedApprovedTags,
  loadCachedAiEnrichmentSettings,
} from "./aiEnrichmentRuntimeCache";
import { PipelinePhaseTimer } from "./pipelineTiming";
import {
  CATALOG_TAG_RERANK_PROMPT_VERSION,
  descriptionLacksVisibleTextOverlap,
  isPlaceholderCatalogDescription,
  resolveCatalogDescription,
} from "./catalogTitleRules";
import { SIMPLE_ENRICHMENT_MAX_TAGS } from "./aiEnrichmentConfig";
import {
  isSuggestedTagsLastResort,
  resolveAiCatalogTags,
  type ResolveAiCatalogTagsResult,
} from "./catalogTagResolver";
import { resolveThemeCategory } from "./catalogThemeCategoryResolver";
import { resolveAiEnrichmentProvider } from "./providers/resolveAiEnrichmentProvider";
import { callTagRerank, TagRerankError } from "./catalogTagRerankProvider";
import {
  CATALOG_SUGGESTED_TAG_AUTHOR_PROMPT_VERSION,
  callSuggestedTagAuthorStandalone,
  selectCalibrationExampleTags,
  SuggestedTagAuthorError,
  type AuthoredSuggestedTag,
} from "./catalogSuggestedTagAuthorProvider";
import { resolveProviderTarget } from "./providers/resolveProviderTarget";

/**
 * Decide whether the optional text-only tag reranker should run for this design, given the
 * settings-controlled mode and the server-side tag matcher's own output. "auto" fires on any of
 * three cheap, deterministic signals that the matcher likely under-resolved this design — the
 * exact symptom reported (too many missed tags / suggestedNewTags). Thresholds are a starting
 * point, expected to need tuning once real auto-mode usage data comes in (see plan §8 note 2).
 */
export function shouldRunTagRerank(mode: TagRerankMode, resolvedTags: ResolveAiCatalogTagsResult): boolean {
  if (mode === "off") {
    return false;
  }

  if (mode === "always") {
    return true;
  }

  return (
    resolvedTags.unmatchedCandidateCount >= 3 ||
    resolvedTags.tags.length < 5 ||
    resolvedTags.suggestedNewTags.length >= 2
  );
}

/**
 * Decide whether the optional AI-authored suggestion-quality call should run. Independent of
 * tagRerankMode (see plan §4.5) — only cares whether the last-resort gate fired for this design
 * (resolvedTags already has suggestedNewTags gated by isSuggestedTagsLastResort internally) and
 * whether the setting allows it. "auto" and "always" behave identically: there is no separate
 * trigger condition beyond the last-resort gate itself.
 */
export function shouldRunSuggestionAuthor(
  mode: SuggestionAuthorMode,
  resolvedTags: ResolveAiCatalogTagsResult,
): boolean {
  if (mode === "off") {
    return false;
  }

  return isSuggestedTagsLastResort({
    allMatchesAreWeak: resolvedTags.allMatchesAreWeak,
    approvedCount: resolvedTags.tags.length,
    unmatchedCandidateCount: resolvedTags.unmatchedCandidateCount,
  });
}

/**
 * Merge AI-authored suggestions back onto the server-templated suggestion list: an authored entry
 * replaces the matching-by-name server template (upgrading its preferredWhen/aliases), while any
 * candidate the AI declined to author (omitted from its output) keeps the server template as a
 * fallback — suggestions are never silently dropped once the last-resort gate has already decided
 * they are needed (plan §4.3).
 */
function mergeAuthoredSuggestions(
  serverTemplateSuggestions: readonly SuggestedNewTag[],
  authored: readonly AuthoredSuggestedTag[],
): SuggestedNewTag[] {
  const authoredByName = new Map(authored.map((entry) => [entry.name, entry]));

  return serverTemplateSuggestions.map((template) => {
    const authoredEntry = authoredByName.get(template.name);

    if (!authoredEntry) {
      return template;
    }

    return {
      aliases: authoredEntry.aliases,
      name: authoredEntry.name,
      preferredWhen: authoredEntry.preferredWhen,
      reason: template.reason,
      source: template.source,
    };
  });
}

interface DesignRecord {
  id: string;
  title: string;
  previewPath?: string;
  thumbnailPath?: string;
  aiRequestedVisionModelId?: string;
  aiProcessingStage?: string;
  aiReviewStatus?: string;
  status?: string;
}

async function downloadPreviewBytes(previewPath: string): Promise<Buffer> {
  const bucket = adminStorage.bucket();
  const normalizedPath = previewPath.replace(/^\//, "");
  const [bytes] = await bucket.file(normalizedPath).download();
  return bytes;
}

async function markAiFailure(
  designId: string,
  error: unknown,
  providerId = resolveAiEnrichmentProvider().providerId,
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : "AI processing failed.";
  const errorCode = resolveVisionErrorCode(error);
  const suggestions: DesignAiSuggestions = {
    errorCode,
    errorMessage,
    provider: providerId,
    generatedAt: new Date().toISOString(),
  };

  await adminDb.collection("designs").doc(designId).update({
    aiProcessingStage: "failed",
    aiProcessed: false,
    aiReviewStatus: "pending",
    aiRequestedVisionModelId: FieldValue.delete(),
    aiSuggestions: suggestions,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

function removeUndefinedFields<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => removeUndefinedFields(item)) as T;
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entryValue]) => entryValue !== undefined)
      .map(([entryKey, entryValue]) => [entryKey, removeUndefinedFields(entryValue)]),
  ) as T;
}

async function markAiSuccess(
  designId: string,
  suggestions: DesignAiSuggestions,
  analysis: DesignAiAnalysis,
): Promise<void> {
  const firestoreSuggestions = removeUndefinedFields(suggestions);
  const firestoreAnalysis = removeUndefinedFields(analysis);

  await adminDb.collection("designs").doc(designId).update({
    aiProcessingStage: "ready_for_review",
    aiProcessed: true,
    aiReviewStatus: "needs_review",
    aiRequestedVisionModelId: FieldValue.delete(),
    ...(suggestions.confidence !== undefined
      ? { aiReviewConfidence: suggestions.confidence }
      : {}),
    ...(suggestions.promptVersion ? { aiReviewVersion: suggestions.promptVersion } : {}),
    aiSuggestions: firestoreSuggestions,
    aiAnalysis: firestoreAnalysis,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function runAiEnrichmentPipeline(
  designId: string,
  geminiApiKey?: string,
): Promise<void> {
  const designSnapshot = await adminDb.collection("designs").doc(designId).get();

  if (!designSnapshot.exists) {
    return;
  }

  const data = designSnapshot.data() as DesignRecord;
  data.id = designId;

  if (data.aiProcessingStage !== "queued") {
    return;
  }

  if (data.aiReviewStatus && data.aiReviewStatus !== "pending") {
    return;
  }

  const previewPath = data.previewPath || data.thumbnailPath;

  if (!previewPath) {
    await markAiFailure(designId, new Error("Preview image is not available for AI processing."));
    return;
  }

  const phaseTimer = new PipelinePhaseTimer();
  const enrichmentSettings = await loadCachedAiEnrichmentSettings();
  const requestedVisionModelId = data.aiRequestedVisionModelId?.trim();
  const provider = resolveAiEnrichmentProvider(
    geminiApiKey,
    enrichmentSettings.visionModelId,
    requestedVisionModelId,
  );

  phaseTimer.logPhase("pipeline.started", {
    designId,
    providerId: provider.providerId,
    modelId: provider.modelId,
    configuredVisionModelId: enrichmentSettings.visionModelId,
    requestedVisionModelId: requestedVisionModelId || null,
    additionalTagExclusionsCount: enrichmentSettings.additionalTagExclusions.length,
  });

  try {
    await updateAiProcessingStage(designId, "preparing_image");
    const previewBytes = await downloadPreviewBytes(previewPath);
    const analysisImage = await prepareAiAnalysisImage(previewBytes);
    const categories = await loadCachedActiveCategories();
    const approvedTags = await loadCachedApprovedTags();
    phaseTimer.logPhase("analysis_image.prepared", {
      designId,
      contentType: analysisImage.contentType,
      height: analysisImage.height,
      width: analysisImage.width,
    });

    await updateAiProcessingStage(designId, "sending_to_ai");
    const result = await provider.enrichDesign({
      designId,
      uploadFileStem: data.title,
      previewPath,
      previewBytes: analysisImage.bytes,
      previewContentType: analysisImage.contentType,
      promptTemplate: enrichmentSettings.promptTemplate,
      categoryOptions: categories.categories,
      categoryNames: categories.names,
      approvedTags,
      approvedTagNames: approvedTags.map((tag) => tag.name),
      categoryIdsByName: categories.idsByName,
      effectiveTagExclusions: enrichmentSettings.effectiveTagExclusions,
    });

    await updateAiProcessingStage(designId, "receiving_response");
    await updateAiProcessingStage(designId, "validating_response");

    const suggestions: DesignAiSuggestions = {
      ...result.suggestions,
      provider: provider.providerId,
      model: provider.modelId,
      promptVersion: provider.promptVersion,
      generatedAt: result.suggestions.generatedAt ?? new Date().toISOString(),
    };

    // Prefer the raw (untokenized) model tags so multi-word approved names and aliases
    // (e.g. "rock and roll") resolve before falling back to suggestions. suggestions.tags is
    // already tokenized into single words, so it is only a fallback when rawTags is absent.
    const resolvedTags = resolveAiCatalogTags({
      approvedTags,
      candidates: result.analysis.rawTags ?? suggestions.tags,
      maxApprovedTags: SIMPLE_ENRICHMENT_MAX_TAGS,
      suggestedNewTags: suggestions.suggestedNewTags,
    });
    suggestions.tags = resolvedTags.tags;
    suggestions.suggestedNewTags =
      resolvedTags.suggestedNewTags.length > 0 ? resolvedTags.suggestedNewTags : undefined;

    const rerankWillRun = shouldRunTagRerank(enrichmentSettings.tagRerankMode, resolvedTags);
    const authorWillRun = shouldRunSuggestionAuthor(enrichmentSettings.suggestionAuthorMode, resolvedTags);

    // Candidate names about to become suggestions, taken from the already last-resort-gated
    // resolvedTags.suggestedNewTags — resolveAiCatalogTags only populates this when
    // isSuggestedTagsLastResort() passed, so no separate gate check is needed here.
    const suggestionCandidateNames = resolvedTags.suggestedNewTags.map((tag) => tag.name);

    if (!authorWillRun || suggestionCandidateNames.length === 0) {
      suggestions.suggestionAuthorStatus = "skipped";
    }

    if (!rerankWillRun) {
      suggestions.tagRerankStatus = "skipped";

      // Rerank is off/not triggered — suggestion-authoring runs as its own standalone call so it
      // never depends on tagRerankMode being on (plan §2.4, user decision "independent fallback").
      if (authorWillRun && suggestionCandidateNames.length > 0) {
        try {
          const exampleApprovedTags = selectCalibrationExampleTags(approvedTags, {
            candidateNames: suggestionCandidateNames,
            matchedTagNames: suggestions.tags,
          });

          const authorResult = await callSuggestedTagAuthorStandalone(
            geminiApiKey ?? "",
            resolveProviderTarget(),
            provider.modelId,
            {
              approvedMatchedTags: suggestions.tags,
              candidateNames: suggestionCandidateNames,
              exampleApprovedTags,
              firstResponse: {
                category: result.analysis.rawCategory ?? "",
                description: suggestions.description ?? "",
                title: suggestions.title ?? "",
              },
            },
            { designId },
          );

          suggestions.suggestedNewTags = mergeAuthoredSuggestions(
            resolvedTags.suggestedNewTags,
            authorResult.suggestions,
          );
          suggestions.suggestionAuthorStatus = "succeeded";
          suggestions.suggestionAuthorPromptTokens = authorResult.promptTokens;
          suggestions.suggestionAuthorCompletionTokens = authorResult.completionTokens;
          suggestions.suggestionAuthorEstimatedCostUsd = authorResult.estimatedCostUsd;
          suggestions.suggestionAuthorPromptVersion = CATALOG_SUGGESTED_TAG_AUTHOR_PROMPT_VERSION;

          logPipelineEvent("suggestion_author.completed", {
            designId,
            candidateCount: suggestionCandidateNames.length,
            authoredCount: authorResult.suggestions.length,
          });
        } catch (error) {
          const reason = error instanceof SuggestedTagAuthorError ? error.reason : "network_error";
          suggestions.suggestionAuthorStatus = "failed";
          suggestions.suggestionAuthorFailureReason = reason;

          logPipelineEvent("suggestion_author.failed", {
            designId,
            reason,
            message: error instanceof Error ? error.message : "unknown_error",
          });
          // suggestions.suggestedNewTags already holds the server-template fallback from
          // resolvedTags above — suggestions still ship, just without AI-authored quality.
        }
      }
    } else {
      // Best-effort category resolution using pre-rerank tags, so the reranker prompt can include a
      // resolved category name. Cheap/deterministic — re-run below with the final tag set regardless.
      const preRerankCategory = resolveThemeCategory(
        {
          rawCategory: result.analysis.rawCategory,
          title: suggestions.title,
          description: suggestions.description,
          visibleText: result.analysis.visibleText,
          matchedTags: suggestions.tags,
          approvedCategories: categories.categories,
        },
        categories.idsByName,
      );

      const mergeSuggestionAuthoring = authorWillRun && suggestionCandidateNames.length > 0;
      const exampleApprovedTags = mergeSuggestionAuthoring
        ? selectCalibrationExampleTags(approvedTags, {
            candidateNames: suggestionCandidateNames,
            matchedTagNames: suggestions.tags,
          })
        : [];

      try {
        const rerankResult = await callTagRerank(
          geminiApiKey ?? "",
          resolveProviderTarget(),
          provider.modelId,
          {
            approvedTagCandidates: resolvedTags.approvedTagCandidates,
            firstResponse: {
              category: result.analysis.rawCategory ?? "",
              description: suggestions.description ?? "",
              tags: suggestions.tags,
              title: suggestions.title ?? "",
            },
            resolvedCategoryName: preRerankCategory.categoryName,
            promptTemplate: enrichmentSettings.tagRerankPromptTemplate,
            suggestionAuthorInput: mergeSuggestionAuthoring
              ? { candidateNames: suggestionCandidateNames, exampleApprovedTags }
              : undefined,
          },
          { designId },
        );

        suggestions.tags = rerankResult.tags;
        suggestions.tagRerankStatus = "succeeded";
        suggestions.tagRerankPromptTokens = rerankResult.promptTokens;
        suggestions.tagRerankCompletionTokens = rerankResult.completionTokens;
        suggestions.tagRerankEstimatedCostUsd = rerankResult.estimatedCostUsd;
        suggestions.tagRerankPromptVersion = CATALOG_TAG_RERANK_PROMPT_VERSION;
        suggestions.tagRerankUncoveredConcepts =
          rerankResult.uncoveredConcepts.length > 0 ? rerankResult.uncoveredConcepts : undefined;

        logPipelineEvent("tag_rerank.completed", {
          designId,
          candidateCount: resolvedTags.approvedTagCandidates.length,
          finalTagCount: rerankResult.tags.length,
          discardedTagCount: rerankResult.discardedTags.length,
          uncoveredConceptCount: rerankResult.uncoveredConcepts.length,
        });

        if (mergeSuggestionAuthoring) {
          // The merged call's suggestion half never fails the rerank half — rerankResult.authoredSuggestions
          // is always an array (possibly empty) once suggestionAuthorInput was provided and the call
          // succeeded at all; an empty array just means the model didn't author usable suggestions,
          // which still leaves the server-template fallback in place via mergeAuthoredSuggestions.
          suggestions.suggestedNewTags = mergeAuthoredSuggestions(
            resolvedTags.suggestedNewTags,
            rerankResult.authoredSuggestions ?? [],
          );
          suggestions.suggestionAuthorStatus = "succeeded";
          // Gemini bills the merged call as one request — the combined cost/tokens are recorded on
          // both tagRerank* and suggestionAuthor* fields for display purposes (plan §4.2 note); this
          // is not a per-call billing split, just ensuring the combined total is visible on either field.
          suggestions.suggestionAuthorPromptTokens = rerankResult.promptTokens;
          suggestions.suggestionAuthorCompletionTokens = rerankResult.completionTokens;
          suggestions.suggestionAuthorEstimatedCostUsd = rerankResult.estimatedCostUsd;
          suggestions.suggestionAuthorPromptVersion = CATALOG_SUGGESTED_TAG_AUTHOR_PROMPT_VERSION;

          logPipelineEvent("suggestion_author.completed", {
            designId,
            candidateCount: suggestionCandidateNames.length,
            authoredCount: rerankResult.authoredSuggestions?.length ?? 0,
            merged: true,
          });
        }

        // uncoveredConcepts may only ever feed suggestedNewTags generation — never a direct final
        // tag. Re-run the resolver once with uncoveredConcepts appended as additional candidates so
        // any genuinely new concept is offered to staff as a normalized, safe suggestion (or dropped
        // by the same single-word-safe-reduction rules as any other unmatched candidate). This
        // deliberately uses suggestions.suggestedNewTags as the seed (which may already carry
        // AI-authored quality from the merge above) so a fresh uncovered-concept re-run does not
        // clobber that upgrade for candidates unaffected by the new concepts.
        if (rerankResult.uncoveredConcepts.length > 0) {
          const withUncoveredConcepts = resolveAiCatalogTags({
            approvedTags,
            candidates: [...(result.analysis.rawTags ?? []), ...rerankResult.uncoveredConcepts],
            maxApprovedTags: SIMPLE_ENRICHMENT_MAX_TAGS,
            suggestedNewTags: suggestions.suggestedNewTags,
          });
          suggestions.suggestedNewTags =
            withUncoveredConcepts.suggestedNewTags.length > 0
              ? withUncoveredConcepts.suggestedNewTags
              : undefined;
        }
      } catch (error) {
        const reason = error instanceof TagRerankError ? error.reason : "network_error";
        suggestions.tagRerankStatus = "failed";
        suggestions.tagRerankFailureReason = reason;
        suggestions.tagRerankPromptTokens = undefined;
        suggestions.tagRerankCompletionTokens = undefined;
        suggestions.tagRerankEstimatedCostUsd = undefined;

        if (mergeSuggestionAuthoring) {
          // A failure in the merged call fails both halves together (it was one request) — but
          // suggestions.suggestedNewTags already holds the server-template fallback from
          // resolvedTags above, so suggestions still ship, just without AI-authored quality.
          suggestions.suggestionAuthorStatus = "failed";
          suggestions.suggestionAuthorFailureReason = reason;
        }

        logPipelineEvent("tag_rerank.failed", {
          designId,
          reason,
          message: error instanceof Error ? error.message : "unknown_error",
        });
        // suggestions.tags already holds resolvedTags.tags from above — fall back as-is.
      }
    }

    // Category resolution runs after tag resolution (and after any rerank) so the final matched
    // approved tags feed the category scoring signal. The model's raw category candidate
    // (result.analysis.rawCategory) is only one competing signal here — never trusted or persisted
    // directly — alongside title, description, visible text, and matched tags. Leaves
    // categoryId/categoryName undefined when no approved category clears the confidence threshold
    // (staff sets it in AI Review).
    const resolvedCategory = resolveThemeCategory(
      {
        rawCategory: result.analysis.rawCategory,
        title: suggestions.title,
        description: suggestions.description,
        visibleText: result.analysis.visibleText,
        matchedTags: suggestions.tags,
        approvedCategories: categories.categories,
      },
      categories.idsByName,
    );
    suggestions.categoryName = resolvedCategory.categoryName;
    suggestions.categoryId = resolvedCategory.categoryId;

    // rawTags/rawCategory are transient resolver inputs; do not persist them with the design.
    delete result.analysis.rawTags;
    delete result.analysis.rawCategory;

    if (descriptionLacksVisibleTextOverlap(suggestions.description, result.analysis.visibleText)) {
      logPipelineEvent("catalog.enrich.description_text_mismatch", {
        designId,
        primaryVisibleText: result.analysis.visibleText?.[0] ?? null,
        descriptionPrefix: suggestions.description?.slice(0, 160) ?? null,
      });
    }

    if (isPlaceholderCatalogDescription(suggestions.description)) {
      const repaired = resolveCatalogDescription({
        candidateDescription: suggestions.description,
        title: suggestions.title,
        primarySubject: result.analysis.primarySubject,
        style: result.analysis.style,
        theme: result.analysis.theme,
        tags: suggestions.tags,
        visibleText: result.analysis.visibleText,
        artworkContainsText: result.analysis.artworkContainsText,
        colorPalette: result.analysis.colorPalette,
      });
      suggestions.description = repaired.description;
      logPipelineEvent("catalog.enrich.description_fallback", {
        designId,
        reason: repaired.fallbackReason ?? "pipeline_guard",
        tier: repaired.fallbackTier ?? "generic",
      });
    }

    await markAiSuccess(designId, suggestions, result.analysis);
    phaseTimer.logPhase("pipeline.completed", {
      designId,
      providerId: provider.providerId,
      confidence: suggestions.confidence ?? null,
      approvedTagCount: suggestions.tags?.length ?? 0,
      suggestedNewTagCount: suggestions.suggestedNewTags?.length ?? 0,
    });
  } catch (error) {
    phaseTimer.logPhase("pipeline.failed", {
      designId,
      providerId: provider.providerId,
      message: error instanceof Error ? error.message : "unknown_error",
    });
    await markAiFailure(designId, error, provider.providerId);
  }
}
