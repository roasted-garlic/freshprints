import { FieldValue } from "firebase-admin/firestore";

import type { DesignAiAnalysis, DesignAiSuggestions } from "../../../shared/types/ai/aiProcessing.types";
import { adminDb, adminStorage } from "../lib/admin";
import { updateAiProcessingStage } from "./designAiFields";
import { logPipelineEvent } from "../lib/pipelineLog";
import { resolveOpenAiErrorCode } from "./openAiRetry";
import { prepareAiAnalysisImage } from "./prepareAiAnalysisImage";
import {
  loadCachedActiveCategories,
  loadCachedAiEnrichmentSettings,
} from "./aiEnrichmentRuntimeCache";
import { PipelinePhaseTimer } from "./pipelineTiming";
import { descriptionLacksVisibleTextOverlap, isPlaceholderCatalogDescription, resolveCatalogDescription } from "./catalogTitleRules";
import { resolveAiEnrichmentProvider } from "./providers/resolveAiEnrichmentProvider";

interface DesignRecord {
  id: string;
  title: string;
  previewPath?: string;
  thumbnailPath?: string;
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
  const errorCode = resolveOpenAiErrorCode(error);
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
  openAiApiKey?: string,
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
  const provider = resolveAiEnrichmentProvider(openAiApiKey, enrichmentSettings.visionModelId);

  phaseTimer.logPhase("pipeline.started", {
    designId,
    providerId: provider.providerId,
    modelId: provider.modelId,
    configuredVisionModelId: enrichmentSettings.visionModelId,
    additionalTagExclusionsCount: enrichmentSettings.additionalTagExclusions.length,
  });

  try {
    await updateAiProcessingStage(designId, "preparing_image");
    const previewBytes = await downloadPreviewBytes(previewPath);
    const analysisImage = await prepareAiAnalysisImage(previewBytes);
    const categories = await loadCachedActiveCategories();
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
      categoryNames: categories.names,
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

    if (suggestions.categoryName && !suggestions.categoryId) {
      suggestions.categoryId = categories.idsByName[suggestions.categoryName.toLowerCase()];
      suggestions.categoryName = suggestions.categoryId ? suggestions.categoryName : undefined;
    }

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
