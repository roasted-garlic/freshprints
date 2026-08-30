import { FieldValue, Timestamp } from "firebase-admin/firestore";



import {

  CATALOG_REPROCESS_DESIGNS_PER_CLAIM,

  CATALOG_REPROCESS_JOBS_COLLECTION,

  CATALOG_REPROCESS_LEASE_MS,

  CATALOG_REPROCESS_OUTCOMES_SUBCOLLECTION,

  isAiReviewQueueEligibleDesign,

  isReadyCatalogEligibleDesign,

} from "../../../packages/shared/src/constants/catalogReprocess.constants";

import type { CatalogReprocessOutcomeDocument } from "../../../packages/shared/src/types/admin/catalogReprocess.types";

import { runAiEnrichmentPipeline } from "../ai/aiEnrichmentPipeline";

import { adminDb } from "../lib/admin";

import { logPipelineEvent } from "../lib/pipelineLog";

import {

  buildCatalogReprocessAiClearUpdate,

  buildReadyCatalogReprocessAiStageUpdate,

} from "./catalogReprocessAiClear";

import {

  pageAiReviewQueueEligibleDesigns,

  pageReadyCatalogEligibleDesigns,

} from "./catalogReprocessEligibility";

import { readyApprovalAuditUnchanged } from "../../../packages/shared/src/utils/firestoreFieldEquality";



function outcomeRef(jobId: string, designId: string) {

  return adminDb

    .collection(CATALOG_REPROCESS_JOBS_COLLECTION)

    .doc(jobId)

    .collection(CATALOG_REPROCESS_OUTCOMES_SUBCOLLECTION)

    .doc(designId);

}



function deriveOutcomeFlags(reasonCodes: string[] | undefined): {

  hardBlocked: boolean;

  categoryGap: boolean;

  categoryDominantIntentConflict: boolean;

  titleValidationIssue: boolean;

  subjectSpecificityIssue: boolean;

  contextualSubjectIssue: boolean;

} {

  const codes = reasonCodes ?? [];

  return {

    hardBlocked: codes.some(

      (code) =>

        code === "category_unresolved" ||

        code === "description_missing" ||

        code === "category_gap_suggested" ||

        code.startsWith("title:") ||

        (code.startsWith("validation:") && !code.includes("missing_generated_at")) ||

        code === "verifier_unresolved" ||

        code === "category_dominant_intent_conflict",

    ),

    categoryGap: codes.some(

      (code) => code === "category_gap_suggested" || code === "category_unresolved",

    ),

    categoryDominantIntentConflict: codes.includes("category_dominant_intent_conflict"),

    titleValidationIssue: codes.some((code) => code.startsWith("title:")),

    subjectSpecificityIssue: codes.some((code) => code.startsWith("subject_specificity_risk:")),

    contextualSubjectIssue: codes.some(

      (code) =>

        code.startsWith("structured_evidence_gap:") ||

        code.includes("contextual") ||

        code.includes("unsupported_subject"),

    ),

  };

}



function extractSmartProfileProvenance(after: Record<string, unknown>) {

  const smartProfile = after.smartProfile as

    | {

        provenance?: {

          promptVersion?: string;

          normalizerVersion?: string;

          automationDecision?: string;

          automationReasonCodes?: string[];

          verifierInvoked?: boolean;

        };

      }

    | undefined;

  const reasonCodes = Array.isArray(smartProfile?.provenance?.automationReasonCodes)

    ? smartProfile.provenance.automationReasonCodes.filter(

        (code): code is string => typeof code === "string",

      )

    : [];

  const automationDecision = smartProfile?.provenance?.automationDecision;

  const wouldAutoApprove =

    automationDecision === "auto_approved" ||

    automationDecision === "shadow" ||

    reasonCodes.includes("shadow_would_auto_approve");

  const flags = deriveOutcomeFlags(reasonCodes);

  return {

    smartProfile,

    reasonCodes,

    automationDecision,

    wouldAutoApprove,

    flags,

    verifierOutcome: reasonCodes.includes("verifier_unresolved")

      ? "unresolved"

      : reasonCodes.includes("verifier_confirmed")

        ? "confirmed"

        : smartProfile?.provenance?.verifierInvoked

          ? "invoked"

          : "skipped",

  };

}



async function renewLease(jobId: string, leaseOwner: string): Promise<void> {

  await adminDb.collection(CATALOG_REPROCESS_JOBS_COLLECTION).doc(jobId).update({

    leaseOwner,

    leaseExpiresAt: Timestamp.fromMillis(Date.now() + CATALOG_REPROCESS_LEASE_MS),

    updatedAt: FieldValue.serverTimestamp(),

  });

}



async function softPauseJob(jobId: string, lastError: string): Promise<void> {

  await adminDb.collection(CATALOG_REPROCESS_JOBS_COLLECTION).doc(jobId).update({

    status: "paused",

    pauseRequested: true,

    lastError,

    leaseOwner: FieldValue.delete(),

    leaseExpiresAt: FieldValue.delete(),

    updatedAt: FieldValue.serverTimestamp(),

  });

}



async function writeOutcome(

  jobId: string,

  designId: string,

  outcome: CatalogReprocessOutcomeDocument,

): Promise<"created" | "already_succeeded" | "replaced_failed"> {

  const ref = outcomeRef(jobId, designId);

  return adminDb.runTransaction(async (tx) => {

    const existing = await tx.get(ref);

    if (existing.exists) {

      const status = existing.data()?.status;

      if (status === "succeeded") {

        return "already_succeeded";

      }

      if (status === "anomaly") {

        return "already_succeeded";

      }

      tx.set(ref, outcome);

      return "replaced_failed";

    }

    tx.set(ref, outcome);

    return "created";

  });

}



function counterPatchForOutcome(

  outcome: CatalogReprocessOutcomeDocument,

  mode: "created" | "replaced_failed",

  targetType: string,

): Record<string, unknown> {

  const patch: Record<string, unknown> = {

    processed: FieldValue.increment(mode === "created" ? 1 : 0),

    updatedAt: FieldValue.serverTimestamp(),

  };



  if (mode === "replaced_failed") {

    patch.failed = FieldValue.increment(-1);

  }



  switch (outcome.status) {

    case "succeeded":

      patch.succeeded = FieldValue.increment(1);

      if (targetType === "ready_catalog") {

        if (outcome.remainedReady) {

          patch.remainedReady = FieldValue.increment(1);

        }

      } else if (outcome.remainedNeedsReview) {

        patch.remainedNeedsReview = FieldValue.increment(1);

      }

      if (outcome.wouldAutoApprove) {

        patch.wouldAutoApprove = FieldValue.increment(1);

      }

      if (outcome.verifierInvoked) {

        patch.verifierInvoked = FieldValue.increment(1);

      }

      if (outcome.verifierOutcome === "unresolved") {

        patch.verifierUnresolved = FieldValue.increment(1);

      }

      if (outcome.hardBlocked) {

        patch.hardBlocked = FieldValue.increment(1);

      }

      if (outcome.categoryDominantIntentConflict) {

        patch.categoryDominantIntentConflict = FieldValue.increment(1);

      }

      break;

    case "failed":

      patch.failed = FieldValue.increment(1);

      break;

    case "skipped_ineligible":

      patch.skipped = FieldValue.increment(1);

      break;

    case "anomaly":

      patch.anomalies = FieldValue.increment(1);

      if (outcome.errorCode === "ready_lifecycle_violation") {

        patch.preservationViolations = FieldValue.increment(1);

      }

      break;

    default:

      break;

  }



  return patch;

}



function nextBoundedDesignId(boundedIds: string[], cursorDesignId?: string): string | undefined {

  const sorted = [...boundedIds].sort();

  if (sorted.length === 0) {

    return undefined;

  }

  if (!cursorDesignId) {

    return sorted[0];

  }

  const idx = sorted.indexOf(cursorDesignId);

  if (idx < 0) {

    return sorted[0];

  }

  return sorted[idx + 1];

}



async function scheduleContinue(

  jobId: string,

  cursorDesignId: string | undefined,

  retryIds: string[],

  justProcessedId: string,

): Promise<void> {

  const remainingRetry = retryIds.filter((id) => id !== justProcessedId);

  await adminDb.collection(CATALOG_REPROCESS_JOBS_COLLECTION).doc(jobId).update({

    cursorDesignId: cursorDesignId ?? FieldValue.delete(),

    ...(retryIds.length > 0

      ? remainingRetry.length > 0

        ? { retryDesignIds: remainingRetry }

        : { retryDesignIds: FieldValue.delete() }

      : {}),

    attemptCount: 0,

    leaseOwner: FieldValue.delete(),

    leaseExpiresAt: FieldValue.delete(),

    status: "pending",

    pauseRequested: false,

    updatedAt: FieldValue.serverTimestamp(),

  });

}



export async function processNextCatalogReprocessUnit(input: {

  jobId: string;

  leaseOwner: string;

  geminiApiKey: string;

  targetType: string;

  dryRun?: boolean;

  cursorDesignId?: string;

  retryDesignIds?: string[];

  boundedDesignIds?: string[];

}): Promise<"continue" | "completed" | "paused" | "failed"> {

  if (input.targetType === "ai_review_queue") {

    return processAiReviewQueueUnit(input);

  }

  if (input.targetType === "ready_catalog") {

    return processReadyCatalogUnit(input);

  }



  const jobRef = adminDb.collection(CATALOG_REPROCESS_JOBS_COLLECTION).doc(input.jobId);

  await jobRef.update({

    status: "failed",

    lastError: "slice_execution_not_enabled",

    leaseOwner: FieldValue.delete(),

    leaseExpiresAt: FieldValue.delete(),

    updatedAt: FieldValue.serverTimestamp(),

  });

  return "failed";

}



async function processAiReviewQueueUnit(input: {

  jobId: string;

  leaseOwner: string;

  geminiApiKey: string;

  dryRun?: boolean;

  cursorDesignId?: string;

  retryDesignIds?: string[];

}): Promise<"continue" | "completed" | "paused" | "failed"> {

  const jobRef = adminDb.collection(CATALOG_REPROCESS_JOBS_COLLECTION).doc(input.jobId);



  const fresh = await jobRef.get();

  const jobData = fresh.data();

  if (!jobData) {

    return "failed";

  }

  if (jobData.pauseRequested === true) {

    await softPauseJob(input.jobId, "pause_requested");

    return "paused";

  }



  let designId: string | undefined;

  let nextCursor = input.cursorDesignId;

  const retryIds = Array.isArray(input.retryDesignIds)

    ? input.retryDesignIds.filter((id) => typeof id === "string" && id.trim())

    : [];



  if (retryIds.length > 0) {

    designId = retryIds[0];

  } else {

    const docs = await pageAiReviewQueueEligibleDesigns({

      startAfterDesignId: input.cursorDesignId,

      limit: CATALOG_REPROCESS_DESIGNS_PER_CLAIM,

    });

    if (docs.length === 0) {

      await jobRef.update({

        status: "completed",

        leaseOwner: FieldValue.delete(),

        leaseExpiresAt: FieldValue.delete(),

        retryDesignIds: FieldValue.delete(),

        updatedAt: FieldValue.serverTimestamp(),

      });

      logPipelineEvent("catalog_reprocess.job.completed", { jobId: input.jobId });

      return "completed";

    }

    designId = docs[0]?.id;

    nextCursor = designId;

  }



  if (!designId) {

    await jobRef.update({

      status: "completed",

      leaseOwner: FieldValue.delete(),

      leaseExpiresAt: FieldValue.delete(),

      updatedAt: FieldValue.serverTimestamp(),

    });

    return "completed";

  }



  const existingOutcome = await outcomeRef(input.jobId, designId).get();

  if (existingOutcome.exists && existingOutcome.data()?.status === "succeeded") {

    const remainingRetry = retryIds.filter((id) => id !== designId);

    await jobRef.update({

      cursorDesignId: nextCursor,

      attemptCount: 0,

      ...(retryIds.length > 0

        ? remainingRetry.length > 0

          ? { retryDesignIds: remainingRetry }

          : { retryDesignIds: FieldValue.delete() }

        : {}),

      leaseOwner: FieldValue.delete(),

      leaseExpiresAt: FieldValue.delete(),

      status: "pending",

      updatedAt: FieldValue.serverTimestamp(),

    });

    return "continue";

  }



  const startedAt = new Date().toISOString();

  const designRef = adminDb.collection("designs").doc(designId);

  const designSnap = await designRef.get();

  const designData = designSnap.data() ?? {};



  if (!isAiReviewQueueEligibleDesign(designData)) {

    const outcome: CatalogReprocessOutcomeDocument = {

      designId,

      status: "skipped_ineligible",

      startedAt,

      completedAt: new Date().toISOString(),

      finalStatus: typeof designData.status === "string" ? designData.status : undefined,

      finalAiReviewStatus:

        typeof designData.aiReviewStatus === "string" ? designData.aiReviewStatus : undefined,

      remainedNeedsReview: false,

      errorCode: "no_longer_eligible",

      errorMessage: "Design no longer matches ai_review_queue eligibility.",

    };

    const writeMode = await writeOutcome(input.jobId, designId, outcome);

    if (writeMode !== "already_succeeded") {

      await jobRef.update({

        ...counterPatchForOutcome(outcome, writeMode, "ai_review_queue"),

        cursorDesignId: nextCursor,

      });

    }

    await scheduleContinue(input.jobId, nextCursor, retryIds, designId);

    return "continue";

  }



  try {

    await renewLease(input.jobId, input.leaseOwner);

    await designRef.update(buildCatalogReprocessAiClearUpdate());

    await runAiEnrichmentPipeline(designId, input.geminiApiKey, { mode: "queue" });



    const afterSnap = await designRef.get();

    const after = afterSnap.data() ?? {};

    const finalStatus = typeof after.status === "string" ? after.status : "";

    const finalAiReviewStatus =

      typeof after.aiReviewStatus === "string" ? after.aiReviewStatus : "";

    const remainedNeedsReview =

      finalStatus === "imported" && finalAiReviewStatus === "needs_review";

    const lifecycleAnomaly = !remainedNeedsReview;



    const provenance = extractSmartProfileProvenance(after);



    if (lifecycleAnomaly) {

      const anomaly: CatalogReprocessOutcomeDocument = {

        designId,

        status: "anomaly",

        startedAt,

        completedAt: new Date().toISOString(),

        errorCode: "shadow_lifecycle_violation",

        errorMessage: `Expected imported+needs_review after Shadow reprocess; got status=${finalStatus} aiReviewStatus=${finalAiReviewStatus}`,

        wouldAutoApprove: provenance.wouldAutoApprove,

        automationDecision:

          typeof provenance.automationDecision === "string"

            ? provenance.automationDecision

            : undefined,

        automationReasonCodes: provenance.reasonCodes,

        verifierInvoked: provenance.smartProfile?.provenance?.verifierInvoked === true,

        hardBlocked: provenance.flags.hardBlocked,

        categoryGap: provenance.flags.categoryGap,

        categoryDominantIntentConflict: provenance.flags.categoryDominantIntentConflict,

        titleValidationIssue: provenance.flags.titleValidationIssue,

        subjectSpecificityIssue: provenance.flags.subjectSpecificityIssue,

        contextualSubjectIssue: provenance.flags.contextualSubjectIssue,

        promptVersion: provenance.smartProfile?.provenance?.promptVersion,

        normalizerVersion: provenance.smartProfile?.provenance?.normalizerVersion,

        finalStatus,

        finalAiReviewStatus,

        remainedNeedsReview: false,

      };

      const writeMode = await writeOutcome(input.jobId, designId, anomaly);

      if (writeMode !== "already_succeeded") {

        await jobRef.update(counterPatchForOutcome(anomaly, writeMode, "ai_review_queue"));

      }

      await softPauseJob(input.jobId, "shadow_lifecycle_violation");

      logPipelineEvent("catalog_reprocess.job.anomaly_pause", {

        jobId: input.jobId,

        designId,

        finalStatus,

        finalAiReviewStatus,

      });

      return "paused";

    }



    const outcome: CatalogReprocessOutcomeDocument = {

      designId,

      status: "succeeded",

      startedAt,

      completedAt: new Date().toISOString(),

      wouldAutoApprove: provenance.wouldAutoApprove,

      automationDecision:

        typeof provenance.automationDecision === "string"

          ? provenance.automationDecision

          : undefined,

      automationReasonCodes: provenance.reasonCodes,

      verifierInvoked: provenance.smartProfile?.provenance?.verifierInvoked === true,

      verifierOutcome: provenance.verifierOutcome,

      hardBlocked: provenance.flags.hardBlocked,

      categoryGap: provenance.flags.categoryGap,

      categoryDominantIntentConflict: provenance.flags.categoryDominantIntentConflict,

      titleValidationIssue: provenance.flags.titleValidationIssue,

      subjectSpecificityIssue: provenance.flags.subjectSpecificityIssue,

      contextualSubjectIssue: provenance.flags.contextualSubjectIssue,

      promptVersion: provenance.smartProfile?.provenance?.promptVersion,

      normalizerVersion: provenance.smartProfile?.provenance?.normalizerVersion,

      finalStatus,

      finalAiReviewStatus,

      remainedNeedsReview: true,

    };



    const writeMode = await writeOutcome(input.jobId, designId, outcome);

    if (writeMode !== "already_succeeded") {

      await jobRef.update({

        ...counterPatchForOutcome(outcome, writeMode, "ai_review_queue"),

        cursorDesignId: nextCursor,

      });

    }



    await scheduleContinue(input.jobId, nextCursor, retryIds, designId);

    return "continue";

  } catch (error) {

    const message = error instanceof Error ? error.message : "unknown_error";

    const outcome: CatalogReprocessOutcomeDocument = {

      designId,

      status: "failed",

      startedAt,

      completedAt: new Date().toISOString(),

      errorCode: error instanceof Error ? error.name : "unknown_error",

      errorMessage: message.slice(0, 500),

      remainedNeedsReview: false,

    };

    const writeMode = await writeOutcome(input.jobId, designId, outcome);

    if (writeMode !== "already_succeeded") {

      await jobRef.update({

        ...counterPatchForOutcome(outcome, writeMode, "ai_review_queue"),

        cursorDesignId: nextCursor,

        lastError: message.slice(0, 300),

      });

    }

    await scheduleContinue(input.jobId, nextCursor, retryIds, designId);

    return "continue";

  }

}



async function processReadyCatalogUnit(input: {

  jobId: string;

  leaseOwner: string;

  geminiApiKey: string;

  dryRun?: boolean;

  cursorDesignId?: string;

  retryDesignIds?: string[];

  boundedDesignIds?: string[];

}): Promise<"continue" | "completed" | "paused" | "failed"> {

  const jobRef = adminDb.collection(CATALOG_REPROCESS_JOBS_COLLECTION).doc(input.jobId);



  const fresh = await jobRef.get();

  const jobData = fresh.data();

  if (!jobData) {

    return "failed";

  }

  if (jobData.pauseRequested === true) {

    await softPauseJob(input.jobId, "pause_requested");

    return "paused";

  }



  const boundedIds = Array.isArray(input.boundedDesignIds)

    ? input.boundedDesignIds.filter((id) => typeof id === "string" && id.trim())

    : [];



  let designId: string | undefined;

  let nextCursor = input.cursorDesignId;

  const retryIds = Array.isArray(input.retryDesignIds)

    ? input.retryDesignIds.filter((id) => typeof id === "string" && id.trim())

    : [];



  if (retryIds.length > 0) {

    designId = retryIds[0];

  } else if (boundedIds.length > 0) {

    designId = nextBoundedDesignId(boundedIds, input.cursorDesignId);

    nextCursor = designId;

    if (!designId) {

      await jobRef.update({

        status: "completed",

        leaseOwner: FieldValue.delete(),

        leaseExpiresAt: FieldValue.delete(),

        retryDesignIds: FieldValue.delete(),

        updatedAt: FieldValue.serverTimestamp(),

      });

      logPipelineEvent("catalog_reprocess.job.completed", {

        jobId: input.jobId,

        targetType: "ready_catalog",

        bounded: true,

      });

      return "completed";

    }

  } else {

    const docs = await pageReadyCatalogEligibleDesigns({

      startAfterDesignId: input.cursorDesignId,

      limit: CATALOG_REPROCESS_DESIGNS_PER_CLAIM,

    });

    if (docs.length === 0) {

      await jobRef.update({

        status: "completed",

        leaseOwner: FieldValue.delete(),

        leaseExpiresAt: FieldValue.delete(),

        retryDesignIds: FieldValue.delete(),

        updatedAt: FieldValue.serverTimestamp(),

      });

      logPipelineEvent("catalog_reprocess.job.completed", {

        jobId: input.jobId,

        targetType: "ready_catalog",

      });

      return "completed";

    }

    designId = docs[0]?.id;

    nextCursor = designId;

  }



  if (!designId) {

    await jobRef.update({

      status: "completed",

      leaseOwner: FieldValue.delete(),

      leaseExpiresAt: FieldValue.delete(),

      updatedAt: FieldValue.serverTimestamp(),

    });

    return "completed";

  }



  const existingOutcome = await outcomeRef(input.jobId, designId).get();

  if (existingOutcome.exists && existingOutcome.data()?.status === "succeeded") {

    const remainingRetry = retryIds.filter((id) => id !== designId);

    await jobRef.update({

      cursorDesignId: nextCursor,

      attemptCount: 0,

      ...(retryIds.length > 0

        ? remainingRetry.length > 0

          ? { retryDesignIds: remainingRetry }

          : { retryDesignIds: FieldValue.delete() }

        : {}),

      leaseOwner: FieldValue.delete(),

      leaseExpiresAt: FieldValue.delete(),

      status: "pending",

      updatedAt: FieldValue.serverTimestamp(),

    });

    return "continue";

  }



  const startedAt = new Date().toISOString();

  const designRef = adminDb.collection("designs").doc(designId);

  const designSnap = await designRef.get();

  const designData = designSnap.data() ?? {};



  const beforeTitle = typeof designData.title === "string" ? designData.title : undefined;

  const beforeCategoryId =

    typeof designData.categoryId === "string" ? designData.categoryId : undefined;

  const beforeAiReviewedBy =

    typeof designData.aiReviewedBy === "string" ? designData.aiReviewedBy : undefined;

  const beforeAiReviewedAt = designData.aiReviewedAt;

  const beforeReadyAt = designData.readyAt;



  if (!isReadyCatalogEligibleDesign(designData)) {

    const outcome: CatalogReprocessOutcomeDocument = {

      designId,

      status: "skipped_ineligible",

      startedAt,

      completedAt: new Date().toISOString(),

      finalStatus: typeof designData.status === "string" ? designData.status : undefined,

      finalAiReviewStatus:

        typeof designData.aiReviewStatus === "string" ? designData.aiReviewStatus : undefined,

      remainedReady: false,

      errorCode: "no_longer_eligible",

      errorMessage: "Design no longer matches ready_catalog eligibility (ready+approved).",

    };

    const writeMode = await writeOutcome(input.jobId, designId, outcome);

    if (writeMode !== "already_succeeded") {

      await jobRef.update({

        ...counterPatchForOutcome(outcome, writeMode, "ready_catalog"),

        cursorDesignId: nextCursor,

      });

    }

    await scheduleContinue(input.jobId, nextCursor, retryIds, designId);

    return "continue";

  }



  try {

    await renewLease(input.jobId, input.leaseOwner);

    await designRef.update(buildReadyCatalogReprocessAiStageUpdate());

    await runAiEnrichmentPipeline(designId, input.geminiApiKey, { mode: "ready_backfill" });



    const afterSnap = await designRef.get();

    const after = afterSnap.data() ?? {};

    const finalStatus = typeof after.status === "string" ? after.status : "";

    const finalAiReviewStatus =

      typeof after.aiReviewStatus === "string" ? after.aiReviewStatus : "";

    const remainedReady = finalStatus === "ready" && finalAiReviewStatus === "approved";

    const lifecycleAnomaly = !remainedReady;



    const afterTitle = typeof after.title === "string" ? after.title : undefined;

    const afterCategoryId =

      typeof after.categoryId === "string" ? after.categoryId : undefined;

    const afterAiReviewedBy =

      typeof after.aiReviewedBy === "string" ? after.aiReviewedBy : undefined;

    const afterAiReviewedAt = after.aiReviewedAt;

    const afterReadyAt = after.readyAt;



    const provenance = extractSmartProfileProvenance(after);



    if (lifecycleAnomaly) {

      const anomaly: CatalogReprocessOutcomeDocument = {

        designId,

        status: "anomaly",

        startedAt,

        completedAt: new Date().toISOString(),

        errorCode: "ready_lifecycle_violation",

        errorMessage: `Expected ready+approved after Ready backfill; got status=${finalStatus} aiReviewStatus=${finalAiReviewStatus}`,

        wouldAutoApprove: provenance.wouldAutoApprove,

        automationDecision:

          typeof provenance.automationDecision === "string"

            ? provenance.automationDecision

            : undefined,

        automationReasonCodes: provenance.reasonCodes,

        verifierInvoked: provenance.smartProfile?.provenance?.verifierInvoked === true,

        hardBlocked: provenance.flags.hardBlocked,

        categoryGap: provenance.flags.categoryGap,

        categoryDominantIntentConflict: provenance.flags.categoryDominantIntentConflict,

        titleValidationIssue: provenance.flags.titleValidationIssue,

        subjectSpecificityIssue: provenance.flags.subjectSpecificityIssue,

        contextualSubjectIssue: provenance.flags.contextualSubjectIssue,

        promptVersion: provenance.smartProfile?.provenance?.promptVersion,

        normalizerVersion: provenance.smartProfile?.provenance?.normalizerVersion,

        finalStatus,

        finalAiReviewStatus,

        remainedReady: false,

      };

      const writeMode = await writeOutcome(input.jobId, designId, anomaly);

      if (writeMode !== "already_succeeded") {

        await jobRef.update(counterPatchForOutcome(anomaly, writeMode, "ready_catalog"));

      }

      await softPauseJob(input.jobId, "ready_lifecycle_violation");

      logPipelineEvent("catalog_reprocess.job.anomaly_pause", {

        jobId: input.jobId,

        designId,

        finalStatus,

        finalAiReviewStatus,

        targetType: "ready_catalog",

      });

      return "paused";

    }



    const outcome: CatalogReprocessOutcomeDocument = {

      designId,

      status: "succeeded",

      startedAt,

      completedAt: new Date().toISOString(),

      wouldAutoApprove: provenance.wouldAutoApprove,

      automationDecision:

        typeof provenance.automationDecision === "string"

          ? provenance.automationDecision

          : undefined,

      automationReasonCodes: provenance.reasonCodes,

      verifierInvoked: provenance.smartProfile?.provenance?.verifierInvoked === true,

      verifierOutcome: provenance.verifierOutcome,

      hardBlocked: provenance.flags.hardBlocked,

      categoryGap: provenance.flags.categoryGap,

      categoryDominantIntentConflict: provenance.flags.categoryDominantIntentConflict,

      titleValidationIssue: provenance.flags.titleValidationIssue,

      subjectSpecificityIssue: provenance.flags.subjectSpecificityIssue,

      contextualSubjectIssue: provenance.flags.contextualSubjectIssue,

      promptVersion: provenance.smartProfile?.provenance?.promptVersion,

      normalizerVersion: provenance.smartProfile?.provenance?.normalizerVersion,

      finalStatus,

      finalAiReviewStatus,

      remainedReady: true,

      titleUnchanged: beforeTitle === afterTitle,

      categoryIdUnchanged: beforeCategoryId === afterCategoryId,

      approvalAuditUnchanged: readyApprovalAuditUnchanged({

        beforeAiReviewedBy,

        afterAiReviewedBy,

        beforeAiReviewedAt,

        afterAiReviewedAt,

        beforeReadyAt,

        afterReadyAt,

      }),

    };



    const writeMode = await writeOutcome(input.jobId, designId, outcome);

    if (writeMode !== "already_succeeded") {

      await jobRef.update({

        ...counterPatchForOutcome(outcome, writeMode, "ready_catalog"),

        cursorDesignId: nextCursor,

      });

    }



    await scheduleContinue(input.jobId, nextCursor, retryIds, designId);

    return "continue";

  } catch (error) {

    const message = error instanceof Error ? error.message : "unknown_error";

    const afterSnap = await designRef.get();

    const after = afterSnap.data() ?? {};

    const finalStatus = typeof after.status === "string" ? after.status : "";

    const finalAiReviewStatus =

      typeof after.aiReviewStatus === "string" ? after.aiReviewStatus : "";



    if (finalStatus !== "ready" || finalAiReviewStatus !== "approved") {

      const anomaly: CatalogReprocessOutcomeDocument = {

        designId,

        status: "anomaly",

        startedAt,

        completedAt: new Date().toISOString(),

        errorCode: "ready_lifecycle_violation",

        errorMessage: `Ready backfill failure left lifecycle status=${finalStatus} aiReviewStatus=${finalAiReviewStatus}`,

        finalStatus,

        finalAiReviewStatus,

        remainedReady: false,

      };

      const writeMode = await writeOutcome(input.jobId, designId, anomaly);

      if (writeMode !== "already_succeeded") {

        await jobRef.update(counterPatchForOutcome(anomaly, writeMode, "ready_catalog"));

      }

      await softPauseJob(input.jobId, "ready_lifecycle_violation");

      return "paused";

    }



    const outcome: CatalogReprocessOutcomeDocument = {

      designId,

      status: "failed",

      startedAt,

      completedAt: new Date().toISOString(),

      errorCode: error instanceof Error ? error.name : "unknown_error",

      errorMessage: message.slice(0, 500),

      finalStatus,

      finalAiReviewStatus,

      remainedReady: true,

    };

    const writeMode = await writeOutcome(input.jobId, designId, outcome);

    if (writeMode !== "already_succeeded") {

      await jobRef.update({

        ...counterPatchForOutcome(outcome, writeMode, "ready_catalog"),

        cursorDesignId: nextCursor,

        lastError: message.slice(0, 300),

      });

    }

    await scheduleContinue(input.jobId, nextCursor, retryIds, designId);

    return "continue";

  }

}


