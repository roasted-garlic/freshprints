import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import {
  CATALOG_REPROCESS_BOUNDED_DESIGN_IDS_MAX,
  CATALOG_REPROCESS_JOBS_COLLECTION,
  CATALOG_REPROCESS_MAX_ATTEMPTS,
  CATALOG_REPROCESS_NORMALIZER_VERSION_SNAPSHOT,
  CATALOG_REPROCESS_OUTCOMES_SUBCOLLECTION,
  CATALOG_REPROCESS_PROMPT_VERSION_SNAPSHOT,
  catalogReprocessUnavailableReason,
  isCatalogReprocessTargetEnabled,
  isCatalogReprocessTargetType,
  isReadyCatalogEligibleDesign,
  resolveCatalogReprocessConfirmationPhrase,
} from "../../../packages/shared/src/constants/catalogReprocess.constants";
import type {
  CatalogReprocessJobControlRequest,
  CatalogReprocessJobControlResponse,
  PreviewCatalogReprocessJobResponse,
  StartCatalogReprocessJobResponse,
} from "../../../packages/shared/src/types/admin/catalogReprocess.types";
import { resolveCatalogWorkflowMode } from "../../../packages/shared/src/constants/catalogWorkflowMode.constants";
import { loadCallerProfile } from "../lib/caller";
import { adminDb } from "../lib/admin";
import { failedPrecondition, invalidArgument, permissionDenied, unauthenticated } from "../lib/errors";
import { loadCachedAiEnrichmentSettings } from "../ai/aiEnrichmentRuntimeCache";
import { findActiveCatalogReprocessJobId } from "./catalogReprocessJobPolicy";
import { buildAiReviewQueueInventory, buildReadyCatalogInventory, estimateEligibleCount } from "./catalogReprocessEligibility";
import { logPipelineEvent } from "../lib/pipelineLog";

function assertOwnerCaller(caller: Awaited<ReturnType<typeof loadCallerProfile>>): void {
  if (!caller.isActive || caller.role !== "owner") {
    throw permissionDenied("Only the owner can manage Catalog Reprocessing.");
  }
}

function resolveProjectContext(): {
  projectId: string;
  environment: "dev" | "production";
  isProduction: boolean;
} {
  const projectId =
    process.env.GCLOUD_PROJECT?.trim() || process.env.GCP_PROJECT?.trim() || "unknown";
  const isProduction = projectId === "fresh-prints-prod";
  return {
    projectId,
    environment: isProduction ? "production" : "dev",
    isProduction,
  };
}

function assertShadowCalibrationStartAllowed(settings: {
  catalogWorkflowMode: string;
  catalogAutonomousLiveEnabled: boolean;
}): void {
  const mode = resolveCatalogWorkflowMode(settings.catalogWorkflowMode);
  if (mode !== "shadow") {
    throw failedPrecondition(
      `Catalog Reprocess Start requires Catalog Processing Mode shadow (current: ${mode}).`,
    );
  }
  if (settings.catalogAutonomousLiveEnabled === true) {
    throw failedPrecondition(
      "Catalog Reprocess Start requires catalogAutonomousLiveEnabled=false.",
    );
  }
}

async function resolveBoundedCanaryDesignIds(input: {
  targetType: string;
  canaryDesignIds: unknown;
}): Promise<string[] | undefined> {
  if (input.targetType !== "ready_catalog") {
    return undefined;
  }
  if (!Array.isArray(input.canaryDesignIds)) {
    return undefined;
  }
  const ids = [
    ...new Set(
      input.canaryDesignIds
        .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
        .map((id) => id.trim()),
    ),
  ];
  if (ids.length === 0) {
    return undefined;
  }
  if (ids.length > CATALOG_REPROCESS_BOUNDED_DESIGN_IDS_MAX) {
    throw invalidArgument(
      `canaryDesignIds exceeds maximum of ${CATALOG_REPROCESS_BOUNDED_DESIGN_IDS_MAX}.`,
    );
  }
  for (const designId of ids) {
    const snap = await adminDb.collection("designs").doc(designId).get();
    if (!snap.exists) {
      throw invalidArgument(`canaryDesignIds includes missing design ${designId}.`);
    }
    if (!isReadyCatalogEligibleDesign(snap.data() ?? {})) {
      throw invalidArgument(
        `canaryDesignIds includes ineligible design ${designId} (requires status=ready and aiReviewStatus=approved).`,
      );
    }
  }
  return ids;
}

export const previewCatalogReprocessJob = onCall(
  async (request): Promise<PreviewCatalogReprocessJobResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    const caller = await loadCallerProfile(request.auth.uid);
    assertOwnerCaller(caller);

    const rawTarget =
      request.data &&
      typeof request.data === "object" &&
      "targetType" in request.data
        ? request.data.targetType
        : undefined;
    if (!isCatalogReprocessTargetType(rawTarget)) {
      throw invalidArgument("targetType must be ai_review_queue or ready_catalog.");
    }

    const { projectId, environment, isProduction } = resolveProjectContext();
    const settings = await loadCachedAiEnrichmentSettings({
      functionName: "previewCatalogReprocessJob",
      invocationId: request.auth.uid,
    });
    const targetEnabled = isCatalogReprocessTargetEnabled(rawTarget);
    const activeJobId = await findActiveCatalogReprocessJobId(projectId, rawTarget);

    const base: PreviewCatalogReprocessJobResponse = {
      targetType: rawTarget,
      environment,
      projectId,
      eligibleCount: 0,
      catalogWorkflowMode: settings.catalogWorkflowMode,
      autonomousLiveEnabled: settings.catalogAutonomousLiveEnabled,
      targetEnabled,
      unavailableReason: targetEnabled
        ? undefined
        : catalogReprocessUnavailableReason(rawTarget),
      requiredConfirmationPhrase: resolveCatalogReprocessConfirmationPhrase({
        targetType: rawTarget,
        isProduction,
      }),
      activeJobId,
    };

    if (!targetEnabled) {
      return base;
    }

    if (rawTarget === "ai_review_queue") {
      const inventory = await buildAiReviewQueueInventory();
      return {
        ...base,
        eligibleCount: inventory.eligibleCount,
        inventory: {
          statusDistribution: inventory.statusDistribution,
          aiReviewStatusDistribution: inventory.aiReviewStatusDistribution,
          promptVersionDistribution: inventory.promptVersionDistribution,
          normalizerVersionDistribution: inventory.normalizerVersionDistribution,
          alreadyV29Count: inventory.alreadyV29Count,
          missingProfileCount: inventory.missingProfileCount,
          exclusions: inventory.exclusions,
          aiReviewNotes: inventory.aiReviewNotes,
          exclusionMethod: inventory.exclusionMethod,
        },
      };
    }

    if (rawTarget === "ready_catalog") {
      const readyInventory = await buildReadyCatalogInventory();
      return {
        ...base,
        eligibleCount: readyInventory.eligibleCount,
        readyInventory,
      };
    }

    return {
      ...base,
      eligibleCount: await estimateEligibleCount(rawTarget),
    };
  },
);

export const startCatalogReprocessJob = onCall(
  async (request): Promise<StartCatalogReprocessJobResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    const caller = await loadCallerProfile(request.auth.uid);
    assertOwnerCaller(caller);

    if (!request.data || typeof request.data !== "object") {
      throw invalidArgument("Request data is required.");
    }

    const rawTarget = "targetType" in request.data ? request.data.targetType : undefined;
    if (!isCatalogReprocessTargetType(rawTarget)) {
      throw invalidArgument("targetType must be ai_review_queue or ready_catalog.");
    }

    if (!isCatalogReprocessTargetEnabled(rawTarget)) {
      throw failedPrecondition(catalogReprocessUnavailableReason(rawTarget));
    }

    const confirmationPhrase =
      "confirmationPhrase" in request.data && typeof request.data.confirmationPhrase === "string"
        ? request.data.confirmationPhrase.trim()
        : "";
    const dryRun = "dryRun" in request.data ? request.data.dryRun === true : false;
    const { projectId, environment, isProduction } = resolveProjectContext();
    const required = resolveCatalogReprocessConfirmationPhrase({
      targetType: rawTarget,
      isProduction,
    });

    if (confirmationPhrase !== required) {
      throw invalidArgument(
        `Confirmation phrase must be exactly "${required}" for this environment and action.`,
      );
    }

    const activeJobId = await findActiveCatalogReprocessJobId(projectId, rawTarget);
    if (activeJobId) {
      throw failedPrecondition(
        `An active Catalog Reprocessing job already exists for this target (${activeJobId}).`,
      );
    }

    const settings = await loadCachedAiEnrichmentSettings({
      functionName: "startCatalogReprocessJob",
      invocationId: request.auth.uid,
    });

    if (rawTarget === "ai_review_queue" || rawTarget === "ready_catalog") {
      assertShadowCalibrationStartAllowed({
        catalogWorkflowMode: settings.catalogWorkflowMode,
        catalogAutonomousLiveEnabled: settings.catalogAutonomousLiveEnabled === true,
      });
    }

    const canaryDesignIds =
      "canaryDesignIds" in request.data ? request.data.canaryDesignIds : undefined;
    const boundedDesignIds = await resolveBoundedCanaryDesignIds({
      targetType: rawTarget,
      canaryDesignIds,
    });

    const totalEligible = boundedDesignIds?.length ?? (await estimateEligibleCount(rawTarget));
    const jobRef = adminDb.collection(CATALOG_REPROCESS_JOBS_COLLECTION).doc();
    const promptVersion = CATALOG_REPROCESS_PROMPT_VERSION_SNAPSHOT;
    const normalizerVersion = CATALOG_REPROCESS_NORMALIZER_VERSION_SNAPSHOT;

    await jobRef.set({
      targetType: rawTarget,
      environment,
      projectId,
      status: "pending",
      createdBy: request.auth.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      pipelineVersion: `${promptVersion}+${normalizerVersion}`,
      promptVersion,
      normalizerVersion,
      catalogWorkflowModeSnapshot: resolveCatalogWorkflowMode(settings.catalogWorkflowMode),
      autonomousLiveEnabledSnapshot: settings.catalogAutonomousLiveEnabled === true,
      totalEligible,
      processed: 0,
      succeeded: 0,
      remainedNeedsReview: 0,
      remainedReady: 0,
      preservationViolations: 0,
      categoryDominantIntentConflict: 0,
      autoApproved: 0,
      wouldAutoApprove: 0,
      verifierInvoked: 0,
      verifierUnresolved: 0,
      hardBlocked: 0,
      anomalies: 0,
      failed: 0,
      retrying: 0,
      skipped: 0,
      attemptCount: 0,
      maxAttempts: CATALOG_REPROCESS_MAX_ATTEMPTS,
      pauseRequested: false,
      confirmationPhrase,
      dryRun,
      ...(boundedDesignIds ? { boundedDesignIds } : {}),
    });

    logPipelineEvent("catalog_reprocess.job.started", {
      jobId: jobRef.id,
      targetType: rawTarget,
      projectId,
      environment,
      dryRun,
      createdBy: request.auth.uid,
      promptVersion,
      normalizerVersion,
    });

    return {
      jobId: jobRef.id,
      dryRun,
      targetType: rawTarget,
      totalEligible,
      status: "pending",
    };
  },
);

export const pauseCatalogReprocessJob = onCall(
  async (request): Promise<CatalogReprocessJobControlResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    assertOwnerCaller(await loadCallerProfile(request.auth.uid));

    const jobId =
      request.data && typeof request.data === "object" && "jobId" in request.data
        ? String(request.data.jobId ?? "").trim()
        : "";
    if (!jobId) {
      throw invalidArgument("jobId is required.");
    }

    const ref = adminDb.collection(CATALOG_REPROCESS_JOBS_COLLECTION).doc(jobId);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      throw invalidArgument("Job not found.");
    }

    await ref.update({
      pauseRequested: true,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      jobId,
      status:
        (snapshot.data()?.status as CatalogReprocessJobControlResponse["status"]) ?? "running",
    };
  },
);

export const resumeCatalogReprocessJob = onCall(
  async (request): Promise<CatalogReprocessJobControlResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    assertOwnerCaller(await loadCallerProfile(request.auth.uid));

    const jobId =
      request.data && typeof request.data === "object" && "jobId" in request.data
        ? String(request.data.jobId ?? "").trim()
        : "";
    if (!jobId) {
      throw invalidArgument("jobId is required.");
    }

    const ref = adminDb.collection(CATALOG_REPROCESS_JOBS_COLLECTION).doc(jobId);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      throw invalidArgument("Job not found.");
    }
    if (snapshot.data()?.status !== "paused" && snapshot.data()?.pauseRequested !== true) {
      throw failedPrecondition("Only paused jobs can be resumed.");
    }

    await ref.update({
      pauseRequested: false,
      status: "pending",
      lastError: FieldValue.delete(),
      leaseOwner: FieldValue.delete(),
      leaseExpiresAt: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { jobId, status: "pending" };
  },
);

export const retryCatalogReprocessJobFailures = onCall(
  async (request): Promise<CatalogReprocessJobControlResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    assertOwnerCaller(await loadCallerProfile(request.auth.uid));

    const data = request.data as CatalogReprocessJobControlRequest | undefined;
    const jobId = typeof data?.jobId === "string" ? data.jobId.trim() : "";
    if (!jobId) {
      throw invalidArgument("jobId is required.");
    }

    const ref = adminDb.collection(CATALOG_REPROCESS_JOBS_COLLECTION).doc(jobId);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      throw invalidArgument("Job not found.");
    }

    const failedOutcomes = await ref
      .collection(CATALOG_REPROCESS_OUTCOMES_SUBCOLLECTION)
      .where("status", "==", "failed")
      .get();

    const retryDesignIds = failedOutcomes.docs.map((docSnap) => docSnap.id);
    const batch = adminDb.batch();
    for (const docSnap of failedOutcomes.docs) {
      batch.delete(docSnap.ref);
    }
    batch.update(ref, {
      status: "pending",
      pauseRequested: false,
      attemptCount: 0,
      lastError: FieldValue.delete(),
      leaseOwner: FieldValue.delete(),
      leaseExpiresAt: FieldValue.delete(),
      retryDesignIds,
      retrying: retryDesignIds.length,
      failed: 0,
      updatedAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();

    return { jobId, status: "pending" };
  },
);
