import { randomUUID } from "node:crypto";

import { FieldValue } from "firebase-admin/firestore";

import type { DesignAiAnalysis, DesignAiSuggestions } from "../../../packages/shared/src/types/ai/aiProcessing.types";
import { adminDb } from "../lib/admin";
import { updateAiProcessingStage } from "./designAiFields";
import { logPipelineEvent } from "../lib/pipelineLog";
import { resolveVisionErrorCode } from "./visionRequestRetry";
import {
  generateAiEnrichmentCandidateForDesign,
  shouldRunSuggestionAuthor,
  shouldRunTagRerank,
  type AiEnrichmentDesignInput,
} from "./aiEnrichmentCandidateCore";
import type { AiEnrichmentReadDiagnosticContext } from "./aiEnrichmentRuntimeCache";
import { maybeRefreshSmartProfileVocabSnapshot } from "./refreshSmartProfileVocabSnapshot";
import { PipelinePhaseTimer } from "./pipelineTiming";
import { resolveAiEnrichmentProvider } from "./providers/resolveAiEnrichmentProvider";
import type { DesignSmartProfile } from "../../../packages/shared/src/types/catalog/smartProfile.types";
import { stripEmptySmartProfileDimensions } from "./smartProfileBuilder";
import { incrementCatalogAutomationHealth } from "./catalogAutomationHealth";
import { buildSmartProfileAiSnapshot, mergeQueueSmartProfileWithImportPresets, mergeReadyBackfillSmartProfile, parseImportPresetSeed } from "./smartProfileEnrichmentWrite";

// Re-export decision helpers so existing aiEnrichmentPipeline.test.ts imports keep working.
export { shouldRunSuggestionAuthor, shouldRunTagRerank };

export type AiEnrichmentPipelineMode = "queue" | "ready_backfill";

export interface RunAiEnrichmentPipelineOptions {
  mode?: AiEnrichmentPipelineMode;
}

interface DesignRecord extends AiEnrichmentDesignInput {
  aiProcessingStage?: string;
  aiReviewStatus?: string;
  status?: string;
}

async function markAiFailure(
  designId: string,
  error: unknown,
  providerId = resolveAiEnrichmentProvider().providerId,
  mode: AiEnrichmentPipelineMode = "queue",
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : "AI processing failed.";
  const errorCode = resolveVisionErrorCode(error);
  const suggestions: DesignAiSuggestions = {
    errorCode,
    errorMessage,
    provider: providerId,
    generatedAt: new Date().toISOString(),
  };

  if (mode === "ready_backfill") {
    await adminDb.collection("designs").doc(designId).update({
      aiProcessingStage: "failed",
      aiProcessed: false,
      aiRequestedVisionModelId: FieldValue.delete(),
      aiSuggestions: suggestions,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return;
  }

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
  smartProfile?: DesignSmartProfile,
  options?: { publishReady?: boolean; mode?: AiEnrichmentPipelineMode },
): Promise<void> {
  const firestoreSuggestions = removeUndefinedFields(suggestions);
  const firestoreAnalysis = removeUndefinedFields(analysis);
  const mode = options?.mode ?? "queue";
  const publishReady = mode === "queue" && options?.publishReady === true;

  let persistedSmartProfile: DesignSmartProfile | undefined;
  let smartProfileAiSnapshot: ReturnType<typeof buildSmartProfileAiSnapshot>;

  if (smartProfile) {
    const stripped = stripEmptySmartProfileDimensions(smartProfile) as unknown as DesignSmartProfile;
    const priorSnap = await adminDb.collection("designs").doc(designId).get();
    const priorData = priorSnap.data();
    const importPresets = parseImportPresetSeed(priorData?.smartProfileImportPresets);
    // Queue and ready_backfill both preserve staff SP edits + import presets when prior exists.
    // (Owner Ready→AI Review demotion keeps smartProfile; Needs Review must not wipe staff keys.)
    const priorProfile =
      priorData?.smartProfile && typeof priorData.smartProfile === "object"
        ? (priorData.smartProfile as DesignSmartProfile)
        : undefined;
    if (mode === "ready_backfill" || priorProfile) {
      const merged = mergeReadyBackfillSmartProfile({
        aiProfile: stripped,
        priorProfile,
        importPresets,
      });
      persistedSmartProfile = removeUndefinedFields(merged.smartProfile) as DesignSmartProfile;
      smartProfileAiSnapshot = merged.smartProfileAiSnapshot;
    } else {
      const withPresets = mergeQueueSmartProfileWithImportPresets({
        aiProfile: stripped,
        importPresets,
      });
      persistedSmartProfile = removeUndefinedFields(
        stripEmptySmartProfileDimensions(withPresets),
      ) as unknown as DesignSmartProfile;
      smartProfileAiSnapshot = buildSmartProfileAiSnapshot(stripped);
    }
  }

  if (mode === "ready_backfill") {
    await adminDb.collection("designs").doc(designId).update({
      aiProcessingStage: "ready_for_review",
      aiProcessed: true,
      aiRequestedVisionModelId: FieldValue.delete(),
      ...(suggestions.confidence !== undefined
        ? { aiReviewConfidence: suggestions.confidence }
        : {}),
      ...(suggestions.promptVersion ? { aiReviewVersion: suggestions.promptVersion } : {}),
      aiSuggestions: firestoreSuggestions,
      aiAnalysis: firestoreAnalysis,
      ...(persistedSmartProfile ? { smartProfile: persistedSmartProfile } : {}),
      ...(smartProfileAiSnapshot ? { smartProfileAiSnapshot } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return;
  }

  await adminDb.collection("designs").doc(designId).update({
    aiProcessingStage: "ready_for_review",
    aiProcessed: true,
    ...(publishReady
      ? {
          status: "ready",
          readyAt: FieldValue.serverTimestamp(),
          aiReviewStatus: "approved",
          aiReviewed: true,
          aiReviewedBy: "system:catalog-autonomy",
          aiReviewedAt: FieldValue.serverTimestamp(),
        }
      : {
          aiReviewStatus: "needs_review",
        }),
    aiRequestedVisionModelId: FieldValue.delete(),
    ...(suggestions.confidence !== undefined
      ? { aiReviewConfidence: suggestions.confidence }
      : {}),
    ...(suggestions.promptVersion ? { aiReviewVersion: suggestions.promptVersion } : {}),
    aiSuggestions: firestoreSuggestions,
    aiAnalysis: firestoreAnalysis,
    ...(persistedSmartProfile
      ? {
          smartProfile: persistedSmartProfile,
        }
      : {}),
    ...(smartProfileAiSnapshot ? { smartProfileAiSnapshot } : {}),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

const activeDesignInvocations = new Map<string, number>();

async function runAiEnrichmentPipelineInternal(
  designId: string,
  geminiApiKey: string | undefined,
  diagnosticContext: AiEnrichmentReadDiagnosticContext,
  mode: AiEnrichmentPipelineMode = "queue",
): Promise<void> {
  const designSnapshot = await adminDb.collection("designs").doc(designId).get();

  if (!designSnapshot.exists) {
    logPipelineEvent("pipeline.skipped", { ...diagnosticContext, reason: "design_missing" });
    return;
  }

  const data = designSnapshot.data() as DesignRecord;
  data.id = designId;

  if (data.aiProcessingStage !== "queued") {
    logPipelineEvent("pipeline.skipped", {
      ...diagnosticContext,
      reason: "stage_not_queued",
      currentStage: data.aiProcessingStage ?? null,
    });
    return;
  }

  if (mode === "ready_backfill") {
    if (data.status !== "ready" || data.aiReviewStatus !== "approved") {
      logPipelineEvent("pipeline.skipped", {
        ...diagnosticContext,
        reason: "ready_backfill_lifecycle_mismatch",
        currentStatus: data.status ?? null,
        currentReviewStatus: data.aiReviewStatus ?? null,
      });
      return;
    }
  } else if (data.aiReviewStatus && data.aiReviewStatus !== "pending") {
    logPipelineEvent("pipeline.skipped", {
      ...diagnosticContext,
      reason: "review_not_pending",
      currentReviewStatus: data.aiReviewStatus,
    });
    return;
  }

  const previewPath = data.previewPath || data.thumbnailPath;

  if (!previewPath) {
    await markAiFailure(
      designId,
      new Error("Preview image is not available for AI processing."),
      resolveAiEnrichmentProvider().providerId,
      mode,
    );
    logPipelineEvent("pipeline.terminal", {
      ...diagnosticContext,
      result: "failed",
      reason: "preview_missing",
    });
    return;
  }

  const phaseTimer = new PipelinePhaseTimer();
  phaseTimer.logPhase("pipeline.started", { designId });

  try {
    const candidate = await generateAiEnrichmentCandidateForDesign({
      designId,
      design: {
        id: designId,
        title: data.title,
        previewPath: data.previewPath,
        thumbnailPath: data.thumbnailPath,
        artworkBackgroundHex: data.artworkBackgroundHex,
        aiRequestedVisionModelId: data.aiRequestedVisionModelId,
        tags: data.tags,
      },
      geminiApiKey: geminiApiKey ?? "",
      diagnosticContext,
      onProcessingStage: async (stage) => {
        await updateAiProcessingStage(designId, stage);
      },
    });

    if (candidate.automationDecision) {
      const automationDecision = candidate.automationDecision;
      await incrementCatalogAutomationHealth({
        analyzed: 1,
        wouldAutoApprove: automationDecision.wouldAutoApprove ? 1 : 0,
        actuallyAutoApproved: automationDecision.shouldPublishReady ? 1 : 0,
        verifierInvoked: automationDecision.verifier.invoked ? 1 : 0,
        verifierConfirmed: automationDecision.verifier.outcome === "confirmed" ? 1 : 0,
        verifierUnresolved: automationDecision.verifier.outcome === "unresolved" ? 1 : 0,
        routedNeedsReview: automationDecision.shouldPublishReady ? 0 : 1,
        categoryGap: automationDecision.reasonCodes.includes("category_gap_suggested") ? 1 : 0,
        hardBlockerRoutings: automationDecision.hardBlockers.length > 0 ? 1 : 0,
      });
    }

    await markAiSuccess(designId, candidate.suggestions, candidate.analysis, candidate.smartProfile, {
      publishReady: mode === "ready_backfill" ? false : candidate.publishReady,
      mode,
    });

    if (candidate.smartProfile) {
      // Opportunistic bounded snapshot refresh — outside the Algolia secret graph; throttled.
      void maybeRefreshSmartProfileVocabSnapshot().catch((error) => {
        logPipelineEvent("smart_profile.vocab_refresh_failed", {
          designId,
          message: error instanceof Error ? error.message : "unknown_error",
        });
      });
    }

    phaseTimer.logPhase("pipeline.completed", {
      designId,
      providerId: candidate.providerId,
      confidence: candidate.suggestions.confidence ?? null,
      approvedTagCount: candidate.suggestions.tags?.length ?? 0,
      suggestedNewTagCount: candidate.suggestions.suggestedNewTags?.length ?? 0,
    });
    logPipelineEvent("pipeline.terminal", {
      ...diagnosticContext,
      result: "completed",
    });
  } catch (error) {
    phaseTimer.logPhase("pipeline.failed", {
      designId,
      message: error instanceof Error ? error.message : "unknown_error",
    });
    logPipelineEvent("pipeline.terminal", {
      ...diagnosticContext,
      result: "failed",
      reason: error instanceof Error ? error.name : "unknown_error",
    });
    await markAiFailure(designId, error, resolveAiEnrichmentProvider().providerId, mode);
    await incrementCatalogAutomationHealth({
      analyzed: 1,
      failures: 1,
    });
  }
}

export async function runAiEnrichmentPipeline(
  designId: string,
  geminiApiKey?: string,
  options?: RunAiEnrichmentPipelineOptions,
): Promise<void> {
  const mode = options?.mode ?? "queue";
  const invocationId = randomUUID();
  const activeForDesign = activeDesignInvocations.get(designId) ?? 0;
  const diagnosticContext: AiEnrichmentReadDiagnosticContext = {
    functionName: "runAiEnrichmentPipeline",
    invocationId,
    designId,
  };

  activeDesignInvocations.set(designId, activeForDesign + 1);
  logPipelineEvent("pipeline.invocation.started", {
    ...diagnosticContext,
    duplicateDesignInvocation: activeForDesign > 0,
    activeInvocationCountForDesign: activeForDesign + 1,
  });

  try {
    await runAiEnrichmentPipelineInternal(designId, geminiApiKey, diagnosticContext, mode);
  } finally {
    const remaining = (activeDesignInvocations.get(designId) ?? 1) - 1;

    if (remaining > 0) {
      activeDesignInvocations.set(designId, remaining);
    } else {
      activeDesignInvocations.delete(designId);
    }

    logPipelineEvent("pipeline.invocation.finished", {
      ...diagnosticContext,
      activeInvocationCountForDesign: Math.max(remaining, 0),
    });
  }
}
