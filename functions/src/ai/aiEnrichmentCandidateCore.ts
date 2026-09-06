import type {
  AiProcessingStage,
  DesignAiAnalysis,
  DesignAiSuggestions,
} from "../../../packages/shared/src/types/ai/aiProcessing.types";
import type { DesignSmartProfile } from "../../../packages/shared/src/types/catalog/smartProfile.types";
import type { SuggestionAuthorMode, TagRerankMode } from "../../../packages/shared/src/constants/aiEnrichment.constants";
import type { ResolveAiCatalogTagsResult } from "./catalogTagResolver";
import type { CatalogAutomationDecisionResult } from "./automationDecisionShadow";
import { adminStorage } from "../lib/admin";
import { logPipelineEvent } from "../lib/pipelineLog";
import { prepareAiAnalysisImage } from "./prepareAiAnalysisImage";
import {
  loadCachedActiveCategories,
  loadCachedAiEnrichmentSettings,
  type AiEnrichmentReadDiagnosticContext,
} from "./aiEnrichmentRuntimeCache";
import { loadSmartProfileVocabSnapshot } from "./loadSmartProfileVocabSnapshot";
import {
  acceptCanonicalCatalogCopy,
  descriptionLacksVisibleTextOverlap,
} from "./catalogTitleRules";
import { resolveAiEnrichmentProvider } from "./providers/resolveAiEnrichmentProvider";
import { buildDesignSmartProfile } from "./smartProfileBuilder";
import { computeCatalogAutomationDecision } from "./automationDecisionShadow";
import {
  buildExplicitContentAutomationPreview,
  classifyExplicitContentAutomation,
  type ExplicitContentAutomationWrite,
} from "../../../packages/shared/src/utils/explicitContentAutomation";

/** Compatibility predicates retained for callers; active tag-AI execution is retired. */
export function shouldRunTagRerank(_mode: TagRerankMode, _resolvedTags: ResolveAiCatalogTagsResult): boolean {
  return false;
}

export function shouldRunSuggestionAuthor(_mode: SuggestionAuthorMode, _resolvedTags: ResolveAiCatalogTagsResult): boolean {
  return false;
}

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

export type { ExplicitContentAutomationWrite };

export type AiEnrichmentCandidate = {
  suggestions: DesignAiSuggestions;
  analysis: DesignAiAnalysis;
  smartProfile?: DesignSmartProfile;
  publishReady: boolean;
  /** Present when Smart Profile parse succeeded — for pipeline health increment only. */
  automationDecision?: CatalogAutomationDecisionResult;
  /**
   * ADR-FP-172: attached when artwork hit + terms + settings OK (not Ready-gated).
   * markAiSuccess still gates on staff Explicit authority and may skip write.
   */
  explicitContentAutomation?: ExplicitContentAutomationWrite;
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
  openAiApiKey?: string;
  diagnosticContext: AiEnrichmentReadDiagnosticContext;
  onProcessingStage?: (stage: AiProcessingStage) => Promise<void>;
  nowIso?: string;
}): Promise<AiEnrichmentCandidate> {
  const { designId, design, geminiApiKey, diagnosticContext, onProcessingStage } = input;
  const openAiApiKey = input.openAiApiKey ?? "";
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
    openAiApiKey,
  );
  void openAiApiKey;

  await maybeNotifyStage(onProcessingStage, "preparing_image");  const previewBytes = await downloadPreviewBytes(previewPath);
  const analysisImage = await prepareAiAnalysisImage(previewBytes, design.artworkBackgroundHex);
  const categories = await loadCachedActiveCategories(diagnosticContext);
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
    approvedTags: [],
    approvedTagNames: [],
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

  // Legacy tag AI is retired from the active enrichment path. Keep historical fields readable,
  // but never resolve, rerank, author, or emit AI tag suggestions for new runs.
  suggestions.tags = [];
  suggestions.suggestedNewTags = undefined;
  suggestions.tagRerankStatus = "skipped";
  suggestions.suggestionAuthorStatus = "skipped";

  /*
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
  const assignedCanonicalNamesLegacy = afterResolve.assignedCanonicalNames;

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
          secondaryApiKey,
          secondaryProviderTarget,
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
      buildThemeCategoryResolveInput({
        rawCategory: result.analysis.rawCategory,
        title: suggestions.title,
        description: suggestions.description,
        visibleText: result.analysis.visibleText,
        matchedTags: [...new Set([...assignedCanonicalNames, ...(suggestions.tags ?? [])])],
        enrichmentParse: result.analysis.smartProfileEnrichmentParse,
        approvedCategories: categories.categories,
      }),
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
        secondaryApiKey,
        secondaryProviderTarget,
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

  */

  // Category resolution runs after tag resolution (and after any rerank) so the final matched
  // approved tags feed the category scoring signal. Enrichment-parse themes/subjects/objects/
  // interests/professionsGroups/searchConcepts are included when present (available on analysis
  // before this step). The model's raw category candidate is only one competing signal — never
  // trusted or persisted directly. Leaves categoryId/categoryName undefined when no approved
  // category clears the confidence threshold (staff sets it in AI Review).
  const enrichmentParse = result.analysis.smartProfileEnrichmentParse;
  const exactAiCategory = categories.categories.find(
    (category) => category.name.trim().toLowerCase() === (result.analysis.rawCategory ?? "").trim().toLowerCase(),
  );
  const resolvedCategory = exactAiCategory
    ? { categoryId: exactAiCategory.id, categoryName: exactAiCategory.name }
    : { categoryId: undefined, categoryName: undefined };
  suggestions.categoryName = resolvedCategory.categoryName;
  suggestions.categoryId = resolvedCategory.categoryId;

  let smartProfile: DesignSmartProfile | undefined;
  let publishReady = false;
  let automationDecision: CatalogAutomationDecisionResult | undefined;

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

    if (enrichmentSettings.settingsReadFailed && automationDecision.wouldAutoApprove) {
      publishReady = false;
      automationDecision = {
        ...automationDecision,
        decision: "needs_review",
        wouldAutoApprove: false,
        shouldPublishReady: false,
        reasonCodes: [
          ...new Set([
            ...automationDecision.reasonCodes.filter(
              (code) => code !== "shadow_would_auto_approve" && code !== "auto_approved",
            ),
            "explicit_automation_settings_unavailable",
          ]),
        ],
      };
      logPipelineEvent("explicit_content_automation.settings_unavailable", {
        designId,
        message: "Settings read failed; fail closed to Needs Review instead of auto-approve.",
      });
    }

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

  let explicitContentAutomation: ExplicitContentAutomationWrite | undefined;
  if (smartProfile && automationDecision) {
    const classification = classifyExplicitContentAutomation({
      artworkEvidenceLines: result.analysis.explicitContentArtworkEvidence ?? [],
      title: suggestions.title,
      description: suggestions.description,
      vocabularyTerms: enrichmentSettings.explicitContentAutomationTerms,
    });

    // Candidate cannot see prior staff authority; pipeline re-checks and may drop the write.
    const willApplyRootWrite =
      !enrichmentSettings.settingsReadFailed &&
      classification.artworkHit === true &&
      classification.censoredTerms.length > 0;

    smartProfile.provenance.explicitAutomationPreview = buildExplicitContentAutomationPreview({
      classification,
      willApplyRootWrite,
    });

    if (willApplyRootWrite) {
      explicitContentAutomation = {
        isExplicitContent: true,
        censoredTerms: classification.censoredTerms,
        explicitContentSource: "automation",
      };
      logPipelineEvent("explicit_content_automation.classified", {
        designId,
        termCount: classification.censoredTerms.length,
        matchedTerms: classification.matches.map((match) => match.matchedVocabularyTerm),
        publishReady,
        settingsReadFailed: enrichmentSettings.settingsReadFailed,
      });
    } else if (classification.artworkHit) {
      logPipelineEvent("explicit_content_automation.detected_no_write", {
        designId,
        wouldAutoApprove: automationDecision.wouldAutoApprove,
        termCount: classification.censoredTerms.length,
        publishReady,
        settingsReadFailed: enrichmentSettings.settingsReadFailed,
      });
    } else if (enrichmentSettings.settingsReadFailed) {
      logPipelineEvent("explicit_content_automation.settings_unavailable_skip_write", {
        designId,
      });
    }
  }

  // rawTags/rawCategory/smartProfileEnrichmentParse/evidence are transient; do not persist.
  delete result.analysis.rawTags;
  delete result.analysis.rawCategory;
  delete result.analysis.smartProfileEnrichmentParse;
  delete result.analysis.explicitContentArtworkEvidence;

  if (descriptionLacksVisibleTextOverlap(suggestions.description, result.analysis.visibleText)) {
    logPipelineEvent("catalog.enrich.description_text_mismatch", {
      designId,
      primaryVisibleText: result.analysis.visibleText?.[0] ?? null,
      descriptionPrefix: suggestions.description?.slice(0, 160) ?? null,
    });
  }

  // Structural re-check only — never synthesize substitute catalog prose.
  suggestions.title = acceptCanonicalCatalogCopy("title", suggestions.title);
  suggestions.description = acceptCanonicalCatalogCopy("description", suggestions.description);

  return {
    suggestions,
    analysis: result.analysis,
    smartProfile,
    publishReady,
    automationDecision,
    explicitContentAutomation,
    providerId: provider.providerId,
    modelId: provider.modelId,
  };
}
