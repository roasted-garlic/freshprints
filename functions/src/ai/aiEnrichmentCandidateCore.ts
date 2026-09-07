import type {
  AiProcessingStage,
  DesignAiAnalysis,
  DesignAiSuggestions,
} from "../../../packages/shared/src/types/ai/aiProcessing.types";
import type { DesignSmartProfile } from "../../../packages/shared/src/types/catalog/smartProfile.types";
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
import { logVcpRuntimeDiagnostic } from "./vcpRuntimeDiagnostics";

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
   * The pipeline applies staff Explicit authority before persistence.
   */
  explicitContentAutomation?: ExplicitContentAutomationWrite;
  providerId: string;
  modelId: string;
};

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
  const {
    designId,
    design,
    geminiApiKey,
    diagnosticContext,
    onProcessingStage,
  } = input;
  const openAiApiKey = input.openAiApiKey ?? "";
  const nowIso = input.nowIso ?? new Date().toISOString();

  const previewPath = design.previewPath || design.thumbnailPath;
  if (!previewPath) {
    throw new Error("Preview image is not available for AI processing.");
  }

  const enrichmentSettings =
    await loadCachedAiEnrichmentSettings(diagnosticContext);
  const requestedVisionModelId = design.aiRequestedVisionModelId?.trim();
  const provider = resolveAiEnrichmentProvider(
    geminiApiKey,
    enrichmentSettings.visionModelId,
    requestedVisionModelId,
    openAiApiKey,
  );
  void openAiApiKey;

  await maybeNotifyStage(onProcessingStage, "preparing_image");
  const previewBytes = await downloadPreviewBytes(previewPath);
  const analysisImage = await prepareAiAnalysisImage(
    previewBytes,
    design.artworkBackgroundHex,
  );
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
    categoryIdsByName: categories.idsByName,
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

  // Category authority is exact-trust against the active category snapshot. Historical design.tags
  // are intentionally not an input and cannot influence category resolution.
  const enrichmentParse = result.analysis.smartProfileEnrichmentParse;
  const exactAiCategory = categories.categories.find(
    (category) =>
      category.name.trim().toLowerCase() ===
      (result.analysis.rawCategory ?? "").trim().toLowerCase(),
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
        title: suggestions.title ?? "",
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
      visualContextProfile: result.analysis.visualContextProfile,
      catalogWorkflowMode: enrichmentSettings.catalogWorkflowMode,
      catalogAutonomousLiveEnabled:
        enrichmentSettings.catalogAutonomousLiveEnabled,
    });

    // Pass 1 is the sole active Processing authority. Semantic Review remains
    // available only through its separately gated manual Playground callable;
    // this path must never create a second provider call, cost, or mutation.
    publishReady = automationDecision.shouldPublishReady;

    if (
      enrichmentSettings.settingsReadFailed &&
      automationDecision.wouldAutoApprove
    ) {
      publishReady = false;
      automationDecision = {
        ...automationDecision,
        decision: "needs_review",
        wouldAutoApprove: false,
        shouldPublishReady: false,
        reasonCodes: [
          ...new Set([
            ...automationDecision.reasonCodes.filter(
              (code) =>
                code !== "shadow_would_auto_approve" &&
                code !== "auto_approved",
            ),
            "explicit_automation_settings_unavailable",
          ]),
        ],
      };
      logPipelineEvent("explicit_content_automation.settings_unavailable", {
        designId,
        message:
          "Settings read failed; fail closed to Needs Review instead of auto-approve.",
      });
    }

    smartProfile.provenance.automationDecision = automationDecision.decision;
    smartProfile.provenance.automationReasonCodes =
      automationDecision.reasonCodes;
    smartProfile.provenance.automationDecisionAt = nowIso;
    smartProfile.provenance.verifierInvoked =
      automationDecision.verifier.invoked;

    logPipelineEvent("smart_profile.automation_decision", {
      designId,
      decision: automationDecision.decision,
      reasonCodes: automationDecision.reasonCodes,
      wouldAutoApprove: automationDecision.wouldAutoApprove,
      shouldPublishReady: automationDecision.shouldPublishReady,
      catalogWorkflowMode: enrichmentSettings.catalogWorkflowMode,
      catalogAutonomousLiveEnabled:
        enrichmentSettings.catalogAutonomousLiveEnabled,
      verifierOutcome: automationDecision.verifier.outcome,
      titleLength: suggestions.title?.length ?? 0,
    });
  }

  let explicitContentAutomation: ExplicitContentAutomationWrite | undefined;
  if (smartProfile && automationDecision) {
    const classification = classifyExplicitContentAutomation({
      artworkEvidenceLines:
        result.analysis.explicitContentArtworkEvidence ?? [],
      title: suggestions.title,
      description: suggestions.description,
      vocabularyTerms: enrichmentSettings.explicitContentAutomationTerms,
    });

    // Candidate cannot see prior staff authority; pipeline re-checks and may drop the write.
    const willApplyRootWrite =
      !enrichmentSettings.settingsReadFailed &&
      classification.artworkHit === true &&
      classification.censoredTerms.length > 0;

    smartProfile.provenance.explicitAutomationPreview =
      buildExplicitContentAutomationPreview({
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
        matchedTerms: classification.matches.map(
          (match) => match.matchedVocabularyTerm,
        ),
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
      logPipelineEvent(
        "explicit_content_automation.settings_unavailable_skip_write",
        {
          designId,
        },
      );
    }
  }

  // rawCategory/smartProfileEnrichmentParse/evidence are transient; do not persist.
  delete result.analysis.rawCategory;
  delete result.analysis.smartProfileEnrichmentParse;
  delete result.analysis.explicitContentArtworkEvidence;

  if (
    descriptionLacksVisibleTextOverlap(
      suggestions.description,
      result.analysis.visibleText,
    )
  ) {
    logPipelineEvent("catalog.enrich.description_text_mismatch", {
      designId,
      primaryVisibleText: result.analysis.visibleText?.[0] ?? null,
      descriptionPrefix: suggestions.description?.slice(0, 160) ?? null,
    });
  }

  // Structural re-check only — never synthesize substitute catalog prose.
  suggestions.title = acceptCanonicalCatalogCopy("title", suggestions.title);
  suggestions.description = acceptCanonicalCatalogCopy(
    "description",
    suggestions.description,
  );

  logVcpRuntimeDiagnostic("vcp_diagnostic.candidate", {
    designId,
    candidateVisualContextProfilePresent: Boolean(
      result.analysis.visualContextProfile,
    ),
  });

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
