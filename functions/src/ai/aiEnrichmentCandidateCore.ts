import type {
  AiProcessingStage,
  DesignAiAnalysis,
  DesignAiSuggestions,
} from "../../../packages/shared/src/types/ai/aiProcessing.types";
import type { SuggestedNewTag } from "../../../packages/shared/src/types/catalogTag.types";
import type { SuggestionAuthorMode, TagRerankMode } from "../../../packages/shared/src/constants/aiEnrichment.constants";
import type { DesignSmartProfile } from "../../../packages/shared/src/types/catalog/smartProfile.types";
import type { CatalogAutomationDecisionResult } from "./automationDecisionShadow";
import { adminStorage } from "../lib/admin";
import { logPipelineEvent } from "../lib/pipelineLog";
import { prepareAiAnalysisImage } from "./prepareAiAnalysisImage";
import {
  loadCachedActiveCategories,
  loadCachedApprovedTags,
  loadCachedAiEnrichmentSettings,
  type AiEnrichmentReadDiagnosticContext,
} from "./aiEnrichmentRuntimeCache";
import { loadSmartProfileVocabSnapshot } from "./loadSmartProfileVocabSnapshot";
import {
  CATALOG_TAG_RERANK_PROMPT_VERSION,
  descriptionLacksVisibleTextOverlap,
  isPlaceholderCatalogDescription,
  resolveCatalogDescription,
} from "./catalogTitleRules";
import { SIMPLE_ENRICHMENT_MAX_TAGS } from "./aiEnrichmentConfig";
import {
  filterCandidatesExcludingAssigned,
  resolveAiCatalogTags,
  subtractAssignedFromAiTagSuggestions,
  type ResolveAiCatalogTagsResult,
} from "./catalogTagResolver";
import { resolveThemeCategory } from "./catalogThemeCategoryResolver";
import { resolveAiEnrichmentProvider } from "./providers/resolveAiEnrichmentProvider";
import { callTagRerank, TagRerankError } from "./catalogTagRerankProvider";
import {
  CATALOG_SUGGESTED_TAG_AUTHOR_PROMPT_VERSION,
  buildReservedCatalogTagTerms,
  callSuggestedTagAuthorStandalone,
  selectCalibrationExampleTags,
  SuggestedTagAuthorError,
  type AuthoredSuggestedTag,
} from "./catalogSuggestedTagAuthorProvider";
import { resolveProviderTarget } from "./providers/resolveProviderTarget";
import { buildDesignSmartProfile } from "./smartProfileBuilder";
import { computeCatalogAutomationDecision } from "./automationDecisionShadow";

/**
 * Design fields required for read-only candidate generation (no lifecycle writes).
 */
export type AiEnrichmentDesignInput = {
  id: string;
  title: string;
  previewPath?: string;
  thumbnailPath?: string;
  artworkBackgroundHex?: string;
  aiRequestedVisionModelId?: string;
  tags?: string[];
};

export type AiEnrichmentCandidate = {
  suggestions: DesignAiSuggestions;
  analysis: DesignAiAnalysis;
  smartProfile?: DesignSmartProfile;
  publishReady: boolean;
  /** Present when Smart Profile parse succeeded — for pipeline health increment only. */
  automationDecision?: CatalogAutomationDecisionResult;
  providerId: string;
  modelId: string;
};

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
 * tagRerankMode — only cares whether suggestedNewTags already survived the settings policy gate
 * and whether the author setting allows it. "auto" and "always" behave identically.
 */
export function shouldRunSuggestionAuthor(
  mode: SuggestionAuthorMode,
  resolvedTags: ResolveAiCatalogTagsResult,
): boolean {
  if (mode === "off") {
    return false;
  }

  return resolvedTags.suggestedNewTags.length > 0;
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

function applyAssignedTagReconciliation(input: {
  approvedTags: Parameters<typeof subtractAssignedFromAiTagSuggestions>[0]["approvedTags"];
  assignedTags: readonly string[] | undefined;
  tags: string[];
  suggestedNewTags?: SuggestedNewTag[];
}): { assignedCanonicalNames: string[]; tags: string[]; suggestedNewTags: SuggestedNewTag[] | undefined } {
  const reconciled = subtractAssignedFromAiTagSuggestions({
    approvedTags: input.approvedTags,
    assignedTags: input.assignedTags,
    tags: input.tags,
    suggestedNewTags: input.suggestedNewTags,
  });
  return {
    assignedCanonicalNames: reconciled.assignedCanonicalNames,
    tags: reconciled.tags,
    suggestedNewTags:
      reconciled.suggestedNewTags.length > 0 ? reconciled.suggestedNewTags : undefined,
  };
}

async function downloadPreviewBytes(previewPath: string): Promise<Buffer> {
  const bucket = adminStorage.bucket();
  const normalizedPath = previewPath.replace(/^\//, "");
  const [bytes] = await bucket.file(normalizedPath).download();
  return bytes;
}

async function maybeNotifyStage(
  onProcessingStage: ((stage: AiProcessingStage) => Promise<void>) | undefined,
  stage: AiProcessingStage,
): Promise<void> {
  if (onProcessingStage) {
    await onProcessingStage(stage);
  }
}

/**
 * Shared read-only AI enrichment candidate generation.
 * Does not persist design state, automation health, or vocab snapshot refreshes.
 */
export async function generateAiEnrichmentCandidateForDesign(input: {
  designId: string;
  design: AiEnrichmentDesignInput;
  geminiApiKey: string;
  diagnosticContext: AiEnrichmentReadDiagnosticContext;
  onProcessingStage?: (stage: AiProcessingStage) => Promise<void>;
  nowIso?: string;
}): Promise<AiEnrichmentCandidate> {
  const { designId, design, geminiApiKey, diagnosticContext, onProcessingStage } = input;
  const nowIso = input.nowIso ?? new Date().toISOString();

  const previewPath = design.previewPath || design.thumbnailPath;
  if (!previewPath) {
    throw new Error("Preview image is not available for AI processing.");
  }

  const enrichmentSettings = await loadCachedAiEnrichmentSettings(diagnosticContext);
  const requestedVisionModelId = design.aiRequestedVisionModelId?.trim();
  const provider = resolveAiEnrichmentProvider(
    geminiApiKey,
    enrichmentSettings.visionModelId,
    requestedVisionModelId,
  );

  await maybeNotifyStage(onProcessingStage, "preparing_image");  const previewBytes = await downloadPreviewBytes(previewPath);
  const analysisImage = await prepareAiAnalysisImage(previewBytes, design.artworkBackgroundHex);
  const categories = await loadCachedActiveCategories(diagnosticContext);
  const approvedTags = await loadCachedApprovedTags(diagnosticContext);
  const smartProfileVocabSnapshot = await loadSmartProfileVocabSnapshot();
  logPipelineEvent("analysis_image.prepared", {
    designId,
    contentType: analysisImage.contentType,
    height: analysisImage.height,
    width: analysisImage.width,
  });

  await maybeNotifyStage(onProcessingStage, "sending_to_ai");
  const result = await provider.enrichDesign({
    designId,
    uploadFileStem: design.title,
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
    smartProfileVocab: smartProfileVocabSnapshot.lists,
  });

  await maybeNotifyStage(onProcessingStage, "receiving_response");
  await maybeNotifyStage(onProcessingStage, "validating_response");

  const suggestions: DesignAiSuggestions = {
    ...result.suggestions,
    provider: provider.providerId,
    model: provider.modelId,
    promptVersion: provider.promptVersion,
    generatedAt: result.suggestions.generatedAt ?? nowIso,
  };

  // Prefer the raw (untokenized) model tags so multi-word approved names and aliases
  // (e.g. "rock and roll") resolve before falling back to suggestions. suggestions.tags is
  // already tokenized into single words, so it is only a fallback when rawTags is absent.
  // D8-A: existing designs.tags do not consume the 8-tag AI allowance — exclude covered
  // candidates before resolve, then subtract again after resolve/rerank.
  const existingDesignTags = Array.isArray(design.tags) ? design.tags : [];
  const candidatesForResolve = filterCandidatesExcludingAssigned({
    approvedTags,
    assignedTags: existingDesignTags,
    candidates: result.analysis.rawTags ?? suggestions.tags,
  });
  const resolvedTags = resolveAiCatalogTags({
    approvedTags,
    candidates: candidatesForResolve,
    maxApprovedTags: SIMPLE_ENRICHMENT_MAX_TAGS,
    suggestedNewTags: suggestions.suggestedNewTags,
    suggestedNewTagsPolicy: enrichmentSettings.suggestedNewTagsPolicy,
  });
  const afterResolve = applyAssignedTagReconciliation({
    approvedTags,
    assignedTags: existingDesignTags,
    tags: resolvedTags.tags,
    suggestedNewTags: resolvedTags.suggestedNewTags,
  });
  suggestions.tags = afterResolve.tags;
  suggestions.suggestedNewTags = afterResolve.suggestedNewTags;
  const assignedCanonicalNames = afterResolve.assignedCanonicalNames;

  const rerankWillRun = shouldRunTagRerank(enrichmentSettings.tagRerankMode, {
    ...resolvedTags,
    tags: suggestions.tags ?? [],
    suggestedNewTags: suggestions.suggestedNewTags ?? [],
  });
  const authorWillRun = shouldRunSuggestionAuthor(enrichmentSettings.suggestionAuthorMode, {
    ...resolvedTags,
    tags: suggestions.tags ?? [],
    suggestedNewTags: suggestions.suggestedNewTags ?? [],
  });

  // Candidate names about to become suggestions — already gated by suggestedNewTagsPolicy + D8-A.
  const suggestionCandidateNames = (suggestions.suggestedNewTags ?? []).map((tag) => tag.name);

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
        const reservedCatalogTerms = buildReservedCatalogTagTerms(approvedTags);

        const authorResult = await callSuggestedTagAuthorStandalone(
          geminiApiKey,
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
            reservedCatalogTerms,
          },
          { designId },
        );

        suggestions.suggestedNewTags = mergeAuthoredSuggestions(
          suggestions.suggestedNewTags ?? [],
          authorResult.suggestions,
        );
        const afterAuthor = applyAssignedTagReconciliation({
          approvedTags,
          assignedTags: existingDesignTags,
          tags: suggestions.tags ?? [],
          suggestedNewTags: suggestions.suggestedNewTags,
        });
        suggestions.tags = afterAuthor.tags;
        suggestions.suggestedNewTags = afterAuthor.suggestedNewTags;
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
        matchedTags: [...new Set([...assignedCanonicalNames, ...(suggestions.tags ?? [])])],
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
        geminiApiKey,
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
            ? {
                candidateNames: suggestionCandidateNames,
                exampleApprovedTags,
                reservedCatalogTerms: buildReservedCatalogTagTerms(approvedTags),
              }
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
          suggestions.suggestedNewTags ?? [],
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

      // D8-A: subtract assigned tags again after rerank (shortlist can reintroduce them).
      {
        const afterRerank = applyAssignedTagReconciliation({
          approvedTags,
          assignedTags: existingDesignTags,
          tags: suggestions.tags ?? [],
          suggestedNewTags: suggestions.suggestedNewTags,
        });
        suggestions.tags = afterRerank.tags;
        suggestions.suggestedNewTags = afterRerank.suggestedNewTags;
      }

      // uncoveredConcepts may only ever feed suggestedNewTags generation — never a direct final
      // tag. Re-run the resolver once with uncoveredConcepts appended as additional candidates so
      // any genuinely new concept is offered to staff as a normalized, safe suggestion (or dropped
      // by the same single-word-safe-reduction rules as any other unmatched candidate). This
      // deliberately uses suggestions.suggestedNewTags as the seed (which may already carry
      // AI-authored quality from the merge above) so a fresh uncovered-concept re-run does not
      // clobber that upgrade for candidates unaffected by the new concepts.
      if (rerankResult.uncoveredConcepts.length > 0) {
        const uncoveredCandidates = filterCandidatesExcludingAssigned({
          approvedTags,
          assignedTags: existingDesignTags,
          candidates: [...(result.analysis.rawTags ?? []), ...rerankResult.uncoveredConcepts],
        });
        const withUncoveredConcepts = resolveAiCatalogTags({
          approvedTags,
          candidates: uncoveredCandidates,
          maxApprovedTags: SIMPLE_ENRICHMENT_MAX_TAGS,
          suggestedNewTags: suggestions.suggestedNewTags,
          suggestedNewTagsPolicy: enrichmentSettings.suggestedNewTagsPolicy,
        });
        const afterUncovered = applyAssignedTagReconciliation({
          approvedTags,
          assignedTags: existingDesignTags,
          tags: suggestions.tags ?? [],
          suggestedNewTags: withUncoveredConcepts.suggestedNewTags,
        });
        suggestions.tags = afterUncovered.tags;
        suggestions.suggestedNewTags = afterUncovered.suggestedNewTags;
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
      matchedTags: [...new Set([...assignedCanonicalNames, ...(suggestions.tags ?? [])])],
      approvedCategories: categories.categories,
    },
    categories.idsByName,
  );
  suggestions.categoryName = resolvedCategory.categoryName;
  suggestions.categoryId = resolvedCategory.categoryId;

  let smartProfile: DesignSmartProfile | undefined;
  let publishReady = false;
  let automationDecision: CatalogAutomationDecisionResult | undefined;
  const enrichmentParse = result.analysis.smartProfileEnrichmentParse;

  if (enrichmentParse) {
    smartProfile = buildDesignSmartProfile({
      parsed: {
        category: result.analysis.rawCategory ?? "",
        description: suggestions.description ?? "",
        suggestedNewTags: suggestions.suggestedNewTags ?? [],
        title: suggestions.title ?? "",
        tags: suggestions.tags ?? [],
        rawTags: result.analysis.rawTags ?? [],
        ...enrichmentParse,
      },
      suggestions,
      categoryId: suggestions.categoryId,
      categoryName: suggestions.categoryName,
      categoryIdsByName: categories.idsByName,
      smartProfileVocab: smartProfileVocabSnapshot.lists,
    });

    automationDecision = computeCatalogAutomationDecision({
      smartProfile,
      title: suggestions.title,
      categoryId: suggestions.categoryId,
      categoryName: suggestions.categoryName ?? smartProfile.categoryName,
      description: suggestions.description,
      visibleText: result.analysis.visibleText,
      catalogWorkflowMode: enrichmentSettings.catalogWorkflowMode,
      catalogAutonomousLiveEnabled: enrichmentSettings.catalogAutonomousLiveEnabled,
    });

    publishReady = automationDecision.shouldPublishReady;

    smartProfile.provenance.automationDecision = automationDecision.decision;
    smartProfile.provenance.automationReasonCodes = automationDecision.reasonCodes;
    smartProfile.provenance.automationDecisionAt = nowIso;
    smartProfile.provenance.verifierInvoked = automationDecision.verifier.invoked;

    logPipelineEvent("smart_profile.automation_decision", {
      designId,
      decision: automationDecision.decision,
      reasonCodes: automationDecision.reasonCodes,
      wouldAutoApprove: automationDecision.wouldAutoApprove,
      shouldPublishReady: automationDecision.shouldPublishReady,
      catalogWorkflowMode: enrichmentSettings.catalogWorkflowMode,
      catalogAutonomousLiveEnabled: enrichmentSettings.catalogAutonomousLiveEnabled,
      verifierOutcome: automationDecision.verifier.outcome,
      titleLength: suggestions.title?.length ?? 0,
    });
  }

  // rawTags/rawCategory/smartProfileEnrichmentParse are transient resolver inputs; do not persist.
  delete result.analysis.rawTags;
  delete result.analysis.rawCategory;
  delete result.analysis.smartProfileEnrichmentParse;

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

  return {
    suggestions,
    analysis: result.analysis,
    smartProfile,
    publishReady,
    automationDecision,
    providerId: provider.providerId,
    modelId: provider.modelId,
  };
}
