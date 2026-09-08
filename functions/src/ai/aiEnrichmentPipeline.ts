import { randomUUID } from "node:crypto";

import { FieldValue } from "firebase-admin/firestore";

import type {
  DesignAiAnalysis,
  DesignAiProcessingError,
  DesignAiSuggestions,
} from "../../../packages/shared/src/types/ai/aiProcessing.types";
import { adminDb } from "../lib/admin";
import { updateAiProcessingStage } from "./designAiFields";
import { logPipelineEvent } from "../lib/pipelineLog";
import {
  resolveVisionErrorCode,
  VisionRequestError,
} from "./visionRequestRetry";
import {
  generateAiEnrichmentCandidateForDesign,
  type AiEnrichmentDesignInput,
} from "./aiEnrichmentCandidateCore";
import type { AiEnrichmentReadDiagnosticContext } from "./aiEnrichmentRuntimeCache";
import {
  clearAiEnrichmentSettingsCache,
  loadCachedAiEnrichmentSettings,
} from "./aiEnrichmentRuntimeCache";
import { maybeRefreshSmartProfileVocabSnapshot } from "./refreshSmartProfileVocabSnapshot";
import { PipelinePhaseTimer } from "./pipelineTiming";
import { resolveAiEnrichmentProvider } from "./providers/resolveAiEnrichmentProvider";
import type { DesignSmartProfile } from "../../../packages/shared/src/types/catalog/smartProfile.types";
import { stripEmptySmartProfileDimensions } from "./smartProfileBuilder";
import { computeCatalogAutomationDecision } from "./automationDecisionShadow";
import { incrementCatalogAutomationHealth } from "./catalogAutomationHealth";
import {
  buildSmartProfileAiSnapshot,
  buildSmartProfileWithHumanAuthorityOnly,
  mergeQueueSmartProfileWithImportPresets,
  mergeReadyBackfillSmartProfile,
  parseImportPresetSeed,
} from "./smartProfileEnrichmentWrite";
import type { ExplicitContentAutomationWrite } from "../../../packages/shared/src/utils/explicitContentAutomation";
import {
  applyHumanAuthorityToExplicitContentAutomationPreview,
  hasProtectedStaffExplicitAuthority,
} from "../../../packages/shared/src/utils/explicitContentAutomation";
import { logVcpRuntimeDiagnostic } from "./vcpRuntimeDiagnostics";
import { writeAiEnrichmentTrace } from "./aiEnrichmentTraceStore";

export type AiEnrichmentPipelineMode = "queue" | "ready_backfill";

export interface RunAiEnrichmentPipelineOptions {
  mode?: AiEnrichmentPipelineMode;
  openAiApiKey?: string;
  attemptId?: string;
}

interface DesignRecord extends AiEnrichmentDesignInput {
  aiProcessingStage?: string;
  aiProcessingAttemptId?: string;
  aiReviewStatus?: string;
  status?: string;
}

class StaleAiProcessingAttemptError extends Error {
  constructor() {
    super("AI processing attempt is no longer current.");
    this.name = "StaleAiProcessingAttemptError";
  }
}

export function isCurrentAiProcessingAttempt(
  data: Record<string, unknown> | undefined,
  attemptId: string,
): boolean {
  return data?.aiProcessingAttemptId === attemptId;
}

async function claimAiProcessingAttempt(
  designId: string,
  attemptId: string,
): Promise<boolean> {
  const designRef = adminDb.collection("designs").doc(designId);
  return adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(designRef);
    const data = snapshot.data() as DesignRecord | undefined;

    if (!snapshot.exists || data?.aiProcessingStage !== "queued") {
      return false;
    }

    if (data.aiProcessingAttemptId && data.aiProcessingAttemptId !== attemptId) {
      return false;
    }

    transaction.update(designRef, {
      aiProcessingAttemptId: attemptId,
      aiProcessingError: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return true;
  });
}

function buildAiProcessingError(
  attemptId: string,
  error: unknown,
  providerId: string,
): DesignAiProcessingError {
  return {
    attemptId,
    errorCode: resolveVisionErrorCode(error),
    errorMessage: error instanceof Error ? error.message : "AI processing failed.",
    provider: providerId,
    occurredAt: new Date().toISOString(),
  };
}

async function markAiFailure(
  designId: string,
  error: unknown,
  attemptId: string,
  providerId = resolveAiEnrichmentProvider().providerId,
  mode: AiEnrichmentPipelineMode = "queue",
): Promise<boolean> {
  const designRef = adminDb.collection("designs").doc(designId);
  const failure = buildAiProcessingError(attemptId, error, providerId);

  return adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(designRef);
    const data = snapshot.data() as Record<string, unknown> | undefined;
    if (!snapshot.exists || !isCurrentAiProcessingAttempt(data, attemptId)) {
      return false;
    }

    transaction.update(designRef, {
      aiProcessingStage: "failed",
      aiProcessed: false,
      ...(mode === "queue" ? { aiReviewStatus: "pending" } : {}),
      aiRequestedVisionModelId: FieldValue.delete(),
      aiProcessingError: failure,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return true;
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
      .map(([entryKey, entryValue]) => [
        entryKey,
        removeUndefinedFields(entryValue),
      ]),
  ) as T;
}

function stripRetiredAiSuggestionFields(
  suggestions: DesignAiSuggestions,
): DesignAiSuggestions {
  const activeSuggestions = { ...suggestions };
  delete activeSuggestions.tags;
  delete activeSuggestions.suggestedNewTags;
  delete activeSuggestions.tagRerankStatus;
  delete activeSuggestions.tagRerankFailureReason;
  delete activeSuggestions.tagRerankPromptTokens;
  delete activeSuggestions.tagRerankCompletionTokens;
  delete activeSuggestions.tagRerankEstimatedCostUsd;
  delete activeSuggestions.tagRerankPromptVersion;
  delete activeSuggestions.tagRerankUncoveredConcepts;
  delete activeSuggestions.suggestionAuthorStatus;
  delete activeSuggestions.suggestionAuthorFailureReason;
  delete activeSuggestions.suggestionAuthorPromptTokens;
  delete activeSuggestions.suggestionAuthorCompletionTokens;
  delete activeSuggestions.suggestionAuthorEstimatedCostUsd;
  delete activeSuggestions.suggestionAuthorPromptVersion;
  return activeSuggestions;
}

function stripTransientAiAnalysisFields(analysis: DesignAiAnalysis): DesignAiAnalysis {
  const persistedAnalysis = { ...analysis };
  delete persistedAnalysis.rawTags;
  delete persistedAnalysis.rawCategory;
  delete persistedAnalysis.smartProfileEnrichmentParse;
  delete persistedAnalysis.explicitContentArtworkEvidence;
  return persistedAnalysis;
}

async function markAiSuccess(
  designId: string,
  attemptId: string,
  suggestions: DesignAiSuggestions,
  analysis: DesignAiAnalysis,
  smartProfile?: DesignSmartProfile,
  options?: {
    publishReady?: boolean;
    mode?: AiEnrichmentPipelineMode;
    explicitContentAutomation?: ExplicitContentAutomationWrite;
  },
): Promise<boolean> {
  const firestoreSuggestions = removeUndefinedFields(
    stripRetiredAiSuggestionFields(suggestions),
  );
  const firestoreAnalysis = removeUndefinedFields(
    stripTransientAiAnalysisFields(analysis),
  );
  const mode = options?.mode ?? "queue";
  const settings = smartProfile && mode === "queue"
    ? await loadCachedAiEnrichmentSettings({
        functionName: "markAiSuccess",
        invocationId: randomUUID(),
        designId,
      })
    : undefined;
  const designRef = adminDb.collection("designs").doc(designId);

  const reconciled = await adminDb.runTransaction(async (transaction) => {
    const priorSnap = await transaction.get(designRef);
    const priorData = priorSnap.data() as Record<string, unknown> | undefined;
    if (!priorSnap.exists || !isCurrentAiProcessingAttempt(priorData, attemptId)) {
      return false;
    }

    const importPresets = parseImportPresetSeed(priorData?.smartProfileImportPresets);
    const priorProfile =
      priorData?.smartProfile && typeof priorData.smartProfile === "object"
        ? (priorData.smartProfile as DesignSmartProfile)
        : undefined;
    let publishReady = mode === "queue" && options?.publishReady === true;
    let persistedSmartProfile: DesignSmartProfile | undefined;
    let smartProfileAiSnapshot: ReturnType<typeof buildSmartProfileAiSnapshot> =
      undefined;

    if (smartProfile) {
      const stripped = stripEmptySmartProfileDimensions(
        smartProfile,
      ) as unknown as DesignSmartProfile;
      if (mode === "ready_backfill" || priorProfile) {
        const merged = mergeReadyBackfillSmartProfile({
          aiProfile: stripped,
          priorProfile,
          importPresets,
        });
        persistedSmartProfile = removeUndefinedFields(
          merged.smartProfile,
        ) as DesignSmartProfile;
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
    } else {
      persistedSmartProfile = buildSmartProfileWithHumanAuthorityOnly({
        priorProfile,
        importPresets,
      });
    }

    const protectedStaffExplicitAuthority = hasProtectedStaffExplicitAuthority({
      isExplicitContent: priorData?.isExplicitContent,
      censoredTerms: priorData?.censoredTerms,
      explicitContentSource: priorData?.explicitContentSource,
      explicitContentAutomationLocked: priorData?.explicitContentAutomationLocked,
    });

    if (persistedSmartProfile?.provenance?.explicitAutomationPreview) {
      persistedSmartProfile.provenance.explicitAutomationPreview =
        applyHumanAuthorityToExplicitContentAutomationPreview(
          persistedSmartProfile.provenance.explicitAutomationPreview,
          { hasProtectedAuthority: protectedStaffExplicitAuthority },
        );
      persistedSmartProfile = stripEmptySmartProfileDimensions(
        persistedSmartProfile,
      ) as unknown as DesignSmartProfile;
    }

    // Re-evaluate WAA only after staff/import authority has been merged into the effective profile.
    if (persistedSmartProfile && mode === "queue" && settings) {
      const effectiveDecision = computeCatalogAutomationDecision({
        smartProfile: persistedSmartProfile,
        title: suggestions.title,
        categoryId: suggestions.categoryId,
        categoryName: suggestions.categoryName ?? persistedSmartProfile.categoryName,
        description: suggestions.description,
        visibleText: analysis.visibleText,
        catalogWorkflowMode: settings.catalogWorkflowMode,
        catalogAutonomousLiveEnabled: settings.catalogAutonomousLiveEnabled,
      });
      publishReady = effectiveDecision.shouldPublishReady;
      persistedSmartProfile.provenance.automationDecision = effectiveDecision.decision;
      persistedSmartProfile.provenance.automationReasonCodes = effectiveDecision.reasonCodes;
    }

    const mayWriteExplicit =
      Boolean(options?.explicitContentAutomation) &&
      !protectedStaffExplicitAuthority;
    const explicitWrite = mayWriteExplicit &&
      options?.explicitContentAutomation?.isExplicitContent === true
      ? {
          isExplicitContent: true as const,
          censoredTerms: options!.explicitContentAutomation!.censoredTerms,
          explicitContentSource: "automation" as const,
        }
      : undefined;
    const explicitClear =
      mayWriteExplicit &&
      options?.explicitContentAutomation?.clearStaleAutomationState === true &&
      priorData?.explicitContentSource === "automation"
        ? {
            isExplicitContent: FieldValue.delete(),
            censoredTerms: FieldValue.delete(),
            explicitContentSource: FieldValue.delete(),
          }
        : undefined;

    const currentProfileFields = persistedSmartProfile
      ? { smartProfile: persistedSmartProfile }
      : { smartProfile: FieldValue.delete() };
    const currentSnapshotFields = smartProfileAiSnapshot
      ? { smartProfileAiSnapshot }
      : { smartProfileAiSnapshot: FieldValue.delete() };
    // ADR-FP-173: a successful fresh review replaces prior review metadata
    // only after the guarded reconciliation. Auto-approval writes its new
    // system actor/timestamp below; Needs Review clears the prior approval.
    const freshReviewFields = mode === "queue"
      ? {
          aiReviewNotes: FieldValue.delete(),
          ...(publishReady
            ? {}
            : {
                aiReviewedBy: FieldValue.delete(),
                aiReviewedAt: FieldValue.delete(),
              }),
        }
      : {};
    const confidenceFields = suggestions.confidence !== undefined
      ? { aiReviewConfidence: suggestions.confidence }
      : { aiReviewConfidence: FieldValue.delete() };
    const versionFields = suggestions.promptVersion
      ? { aiReviewVersion: suggestions.promptVersion }
      : { aiReviewVersion: FieldValue.delete() };

    if (mode === "ready_backfill") {
      transaction.update(designRef, {
        aiProcessingStage: "ready_for_review",
        aiProcessed: true,
        aiRequestedVisionModelId: FieldValue.delete(),
        aiProcessingError: FieldValue.delete(),
        ...confidenceFields,
        ...versionFields,
        aiSuggestions: firestoreSuggestions,
        aiAnalysis: firestoreAnalysis,
        ...currentProfileFields,
        ...currentSnapshotFields,
        ...(explicitWrite ?? explicitClear ?? {}),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      transaction.update(designRef, {
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
              aiReviewed: false,
            }),
        ...freshReviewFields,
        aiRequestedVisionModelId: FieldValue.delete(),
        aiProcessingError: FieldValue.delete(),
        ...confidenceFields,
        ...versionFields,
        aiSuggestions: firestoreSuggestions,
        aiAnalysis: firestoreAnalysis,
        ...currentProfileFields,
        ...currentSnapshotFields,
        ...(explicitWrite ?? explicitClear ?? {}),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    return true;
  });

  if (!reconciled) {
    logPipelineEvent("pipeline.reconciliation_stale_attempt", { designId, attemptId });
    return false;
  }

  logVcpRuntimeDiagnostic("vcp_diagnostic.persistence", {
    designId,
    writeBranch: mode,
    persistenceVisualContextProfilePresent: Boolean(
      firestoreAnalysis.visualContextProfile,
    ),
  });
  return true;
}

const activeDesignInvocations = new Map<string, number>();

async function runAiEnrichmentPipelineInternal(
  designId: string,
  geminiApiKey: string | undefined,
  diagnosticContext: AiEnrichmentReadDiagnosticContext,
  attemptId: string,
  mode: AiEnrichmentPipelineMode = "queue",
  openAiApiKey?: string,
): Promise<boolean> {
  const designSnapshot = await adminDb
    .collection("designs")
    .doc(designId)
    .get();

  if (!designSnapshot.exists) {
    logPipelineEvent("pipeline.skipped", {
      ...diagnosticContext,
      reason: "design_missing",
    });
    return false;
  }

  let data = designSnapshot.data() as DesignRecord;
  data.id = designId;

  if (data.aiProcessingStage !== "queued") {
    logPipelineEvent("pipeline.skipped", {
      ...diagnosticContext,
      reason: "stage_not_queued",
      currentStage: data.aiProcessingStage ?? null,
    });
    return false;
  }

  if (!(await claimAiProcessingAttempt(designId, attemptId))) {
    logPipelineEvent("pipeline.skipped", {
      ...diagnosticContext,
      reason: "stale_attempt",
      attemptId,
    });
    return false;
  }

  const claimedSnapshot = await adminDb.collection("designs").doc(designId).get();
  data = claimedSnapshot.data() as DesignRecord;
  data.id = designId;

  if (mode === "ready_backfill") {
    if (data.status !== "ready" || data.aiReviewStatus !== "approved") {
      logPipelineEvent("pipeline.skipped", {
        ...diagnosticContext,
        reason: "ready_backfill_lifecycle_mismatch",
        currentStatus: data.status ?? null,
        currentReviewStatus: data.aiReviewStatus ?? null,
      });
      return false;
    }
  } else if (data.aiReviewStatus && data.aiReviewStatus !== "pending") {
    logPipelineEvent("pipeline.skipped", {
      ...diagnosticContext,
      reason: "review_not_pending",
      currentReviewStatus: data.aiReviewStatus,
    });
    return false;
  }

  const previewPath = data.previewPath || data.thumbnailPath;

  if (!previewPath) {
    await markAiFailure(
      designId,
      new Error("Preview image is not available for AI processing."),
      attemptId,
      resolveAiEnrichmentProvider().providerId,
      mode,
    );
    logPipelineEvent("pipeline.terminal", {
      ...diagnosticContext,
      result: "failed",
      reason: "preview_missing",
    });
    await writeAiEnrichmentTrace({
      schemaVersion: 1,
      traceId: diagnosticContext.invocationId,
      source: "LIVE PROCESSING",
      designId,
      attemptId,
      captureFullTrace: false,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      lifecycleState: "failed",
      provider: resolveAiEnrichmentProvider().providerId,
      providerError: { classification: "preview_missing" },
      stages: [
        { stage: "created", at: new Date().toISOString() },
        {
          stage: "failed",
          at: new Date().toISOString(),
          data: {
            parser: "NOT REACHED",
            normalized: "NOT REACHED",
            vcp: "NOT REACHED",
            candidate: "NOT REACHED",
            persistence: "NOT REACHED",
          },
        },
      ],
    });
    return false;
  }

  const phaseTimer = new PipelinePhaseTimer();
  phaseTimer.logPhase("pipeline.started", { designId });

  // Dual-provider: Settings visionModelId can change between runs on a warm instance.
  // Bust settings TTL so each design resolves the current Default AI model / provider.
  clearAiEnrichmentSettingsCache();

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
      },
      geminiApiKey: geminiApiKey ?? "",
      openAiApiKey: openAiApiKey ?? "",
      diagnosticContext,
      onProcessingStage: async (stage) => {
        if (!(await updateAiProcessingStage(designId, stage, attemptId))) {
          throw new StaleAiProcessingAttemptError();
        }
      },
    });

    if (candidate.automationDecision) {
      const automationDecision = candidate.automationDecision;
      await incrementCatalogAutomationHealth({
        analyzed: 1,
        wouldAutoApprove: automationDecision.wouldAutoApprove ? 1 : 0,
        actuallyAutoApproved: automationDecision.shouldPublishReady ? 1 : 0,
        routedNeedsReview: automationDecision.shouldPublishReady ? 0 : 1,
        categoryGap: automationDecision.reasonCodes.includes(
          "category_gap_suggested",
        )
          ? 1
          : 0,
        hardBlockerRoutings: automationDecision.hardBlockers.length > 0 ? 1 : 0,
      });
    }

    const successPersisted = await markAiSuccess(
      designId,
      attemptId,
      candidate.suggestions,
      candidate.analysis,
      candidate.smartProfile,
      {
        publishReady:
          mode === "ready_backfill" ? false : candidate.publishReady,
        mode,
        explicitContentAutomation: candidate.explicitContentAutomation,
      },
    );
    if (!successPersisted) {
      return false;
    }

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
    });
    logPipelineEvent("pipeline.terminal", {
      ...diagnosticContext,
      result: "completed",
    });
  } catch (error) {
    if (error instanceof StaleAiProcessingAttemptError) {
      logPipelineEvent("pipeline.terminal", {
        ...diagnosticContext,
        result: "stale_attempt",
      });
      return false;
    }
    phaseTimer.logPhase("pipeline.failed", {
      designId,
      message: error instanceof Error ? error.message : "unknown_error",
    });
    logPipelineEvent("pipeline.terminal", {
      ...diagnosticContext,
      result: "failed",
      reason: error instanceof Error ? error.name : "unknown_error",
    });
    const failurePersisted = await markAiFailure(
      designId,
      error,
      attemptId,
      resolveAiEnrichmentProvider().providerId,
      mode,
    );
    if (!failurePersisted) {
      return false;
    }
    await incrementCatalogAutomationHealth({
      analyzed: 1,
      failures: 1,
    });
    await writeAiEnrichmentTrace({
      schemaVersion: 1,
      traceId: diagnosticContext.invocationId,
      source: "LIVE PROCESSING",
      designId,
      attemptId,
      captureFullTrace: false,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      lifecycleState: "failed",
      provider: resolveAiEnrichmentProvider().providerId,
      providerError:
        error instanceof VisionRequestError
          ? error.providerError
          : { classification: "ai_processing_failed" },
      stages: [
        { stage: "created", at: new Date().toISOString() },
        {
          stage: "failed",
          at: new Date().toISOString(),
          data: {
            parser: "NOT REACHED",
            normalized: "NOT REACHED",
            vcp: "NOT REACHED",
            candidate: "NOT REACHED",
            persistence: "NOT REACHED",
          },
        },
      ],
    });
    return false;
  }
  return true;
}

export async function runAiEnrichmentPipeline(
  designId: string,
  geminiApiKey?: string,
  options?: RunAiEnrichmentPipelineOptions,
): Promise<void> {
  const mode = options?.mode ?? "queue";
  const invocationId = randomUUID();
  const attemptId = options?.attemptId ?? randomUUID();
  const activeForDesign = activeDesignInvocations.get(designId) ?? 0;
  const diagnosticContext: AiEnrichmentReadDiagnosticContext = {
    functionName: "runAiEnrichmentPipeline",
    invocationId,
    designId,
    attemptId,
  };
  const traceId = invocationId;
  await writeAiEnrichmentTrace({
    schemaVersion: 1,
    traceId,
    source: "LIVE PROCESSING",
    designId,
    attemptId,
    captureFullTrace: false,
    startedAt: new Date().toISOString(),
    lifecycleState: "created",
    stages: [{ stage: "created", at: new Date().toISOString() }],
  });

  activeDesignInvocations.set(designId, activeForDesign + 1);
  logPipelineEvent("pipeline.invocation.started", {
    ...diagnosticContext,
    duplicateDesignInvocation: activeForDesign > 0,
    activeInvocationCountForDesign: activeForDesign + 1,
  });

  try {
    const succeeded = await runAiEnrichmentPipelineInternal(
      designId,
      geminiApiKey,
      diagnosticContext,
      attemptId,
      mode,
      options?.openAiApiKey,
    );
    if (succeeded) {
      void writeAiEnrichmentTrace({
        schemaVersion: 1,
        traceId,
        source: "LIVE PROCESSING",
        designId,
        attemptId,
        captureFullTrace: false,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        lifecycleState: "complete",
        stages: [
          { stage: "created", at: new Date().toISOString() },
          { stage: "complete", at: new Date().toISOString() },
        ],
      });
    }
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
