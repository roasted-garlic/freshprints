import { FieldValue } from "firebase-admin/firestore";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";

import { CATALOG_REPROCESS_JOBS_COLLECTION } from "../../../packages/shared/src/constants/catalogReprocess.constants";
import { adminDb } from "../lib/admin";
import { geminiApiKeySecret, openAiApiKeySecret } from "../lib/secrets";
import { claimCatalogReprocessJob } from "./catalogReprocessJobPolicy";
import { processNextCatalogReprocessUnit } from "./catalogReprocessWorker";
import { logPipelineEvent } from "../lib/pipelineLog";

/**
 * Durable Catalog Reprocessing worker.
 * Slice 5: ai_review_queue execution.
 * Slice 6: ready_catalog execution (Ready-preservation path).
 */
export const onCatalogReprocessJobWritten = onDocumentWritten(
  {
    document: `${CATALOG_REPROCESS_JOBS_COLLECTION}/{jobId}`,
    secrets: [geminiApiKeySecret, openAiApiKeySecret],
    timeoutSeconds: 540,
    memory: "1GiB",
  },
  async (event) => {
    const jobId = String(event.params.jobId ?? "");
    if (!jobId) {
      return;
    }
    const after = event.data?.after;
    if (!after?.exists) {
      return;
    }

    const data = after.data();
    if (!data) {
      return;
    }

    if (data.status !== "pending" && data.status !== "running") {
      return;
    }

    const leaseOwner = `worker:${process.env.K_REVISION ?? "local"}:${Date.now()}`;
    const claim = await claimCatalogReprocessJob(jobId, leaseOwner);
    if (!claim.claimed) {
      if (claim.pauseRequested) {
        logPipelineEvent("catalog_reprocess.job.paused", { jobId });
      }
      return;
    }

    const ref = adminDb.collection(CATALOG_REPROCESS_JOBS_COLLECTION).doc(jobId);

    try {
      if (data.dryRun === true) {
        await ref.update({
          status: "completed",
          processed: data.totalEligible ?? 0,
          succeeded: data.totalEligible ?? 0,
          leaseOwner: FieldValue.delete(),
          leaseExpiresAt: FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        logPipelineEvent("catalog_reprocess.job.completed_dry_run", { jobId });
        return;
      }

      const fresh = await ref.get();
      if (fresh.data()?.pauseRequested === true) {
        await ref.update({
          status: "paused",
          leaseOwner: FieldValue.delete(),
          leaseExpiresAt: FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        return;
      }

      const targetType = typeof data.targetType === "string" ? data.targetType : "";
      if (targetType !== "ai_review_queue" && targetType !== "ready_catalog") {
        await ref.update({
          status: "failed",
          lastError: "slice_execution_not_enabled",
          leaseOwner: FieldValue.delete(),
          leaseExpiresAt: FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        logger.warn("catalog_reprocess.job.unsupported_target", { jobId, targetType });
        return;
      }

      await processNextCatalogReprocessUnit({
        jobId,
        leaseOwner,
        geminiApiKey: geminiApiKeySecret.value(),
        openAiApiKey: openAiApiKeySecret.value(),
        targetType,
        dryRun: data.dryRun === true,
        cursorDesignId:
          typeof data.cursorDesignId === "string" ? data.cursorDesignId : undefined,
        retryDesignIds: Array.isArray(data.retryDesignIds)
          ? data.retryDesignIds.filter((id: unknown): id is string => typeof id === "string")
          : undefined,
        boundedDesignIds: Array.isArray(data.boundedDesignIds)
          ? data.boundedDesignIds.filter((id: unknown): id is string => typeof id === "string")
          : undefined,
      });
    } catch (error) {
      await ref.update({
        status: "failed",
        lastError: error instanceof Error ? error.message : "unknown_error",
        leaseOwner: FieldValue.delete(),
        leaseExpiresAt: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  },
);
