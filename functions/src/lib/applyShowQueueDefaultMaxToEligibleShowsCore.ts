import { FieldValue, type Firestore } from "firebase-admin/firestore";

import type {
  ApplyShowQueueDefaultMaxPartialFailureDetails,
  ApplyShowQueueDefaultMaxToEligibleShowsRequest,
  ApplyShowQueueDefaultMaxToEligibleShowsResponse,
} from "../../../packages/shared/src/types/upcomingShow/applyShowQueueDefaultMax.types";
import {
  SHOW_QUEUE_DEFAULT_MAX_APPLY_PRODUCTION_STATUSES,
  isShowEligibleForDefaultMaxApply,
  shouldSkipDefaultMaxApplyForAllocatedQuantity,
} from "../../../packages/shared/src/utils/showQueueDefaultMaxApplyEligibility";

import { failedPrecondition, invalidArgument } from "./errors";

export const SHOW_QUEUE_SETTINGS_DOC_ID = "showQueue";
export const APPLY_SHOW_QUEUE_DEFAULT_MAX_BATCH_SIZE = 400;

export function parseApplyShowQueueDefaultMaxRequest(
  data: unknown,
): ApplyShowQueueDefaultMaxToEligibleShowsRequest {
  if (!data || typeof data !== "object") {
    throw invalidArgument("Request data is required.");
  }

  if (!("defaultMaxTotalQuantity" in data)) {
    throw invalidArgument("defaultMaxTotalQuantity is required (number or null to clear).");
  }

  const raw = (data as { defaultMaxTotalQuantity: unknown }).defaultMaxTotalQuantity;
  if (raw === null) {
    return { defaultMaxTotalQuantity: null };
  }

  if (typeof raw !== "number" || !Number.isFinite(raw) || !Number.isInteger(raw) || raw < 0) {
    throw invalidArgument("defaultMaxTotalQuantity must be a non-negative integer, or null to clear.");
  }

  return { defaultMaxTotalQuantity: raw };
}

function chunkIds<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export async function applyShowQueueDefaultMaxToEligibleShowsCore(input: {
  db: Firestore;
  callerUid: string;
  defaultMaxTotalQuantity: number | null;
  now?: Date;
  batchSize?: number;
}): Promise<ApplyShowQueueDefaultMaxToEligibleShowsResponse> {
  const now = input.now ?? new Date();
  const batchSize = input.batchSize ?? APPLY_SHOW_QUEUE_DEFAULT_MAX_BATCH_SIZE;
  const settingsRef = input.db.collection("settings").doc(SHOW_QUEUE_SETTINGS_DOC_ID);

  const settingsPayload: Record<string, unknown> = {
    updatedBy: input.callerUid,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.defaultMaxTotalQuantity === null) {
    settingsPayload.defaultMaxTotalQuantity = FieldValue.delete();
  } else {
    settingsPayload.defaultMaxTotalQuantity = input.defaultMaxTotalQuantity;
  }

  await settingsRef.set(settingsPayload, { merge: true });

  // Bounded query: operational production statuses only, then filter source/schedule in trusted code.
  const snapshot = await input.db
    .collection("upcomingShows")
    .where("productionStatus", "in", [...SHOW_QUEUE_DEFAULT_MAX_APPLY_PRODUCTION_STATUSES])
    .get();

  const toUpdate: Array<{ id: string }> = [];
  let skippedBelowAllocatedCount = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const candidate = {
      source: typeof data.source === "string" ? data.source : null,
      productionStatus: typeof data.productionStatus === "string" ? data.productionStatus : null,
      isArchived: data.isArchived === true,
      scheduledStartAt:
        data.scheduledStartAt && typeof data.scheduledStartAt.toDate === "function"
          ? data.scheduledStartAt
          : null,
      allocatedQuantity:
        typeof data.allocatedQuantity === "number" ? data.allocatedQuantity : 0,
      maxTotalQuantity:
        typeof data.maxTotalQuantity === "number" ? data.maxTotalQuantity : null,
    };

    if (!isShowEligibleForDefaultMaxApply(candidate, now)) {
      continue;
    }

    if (shouldSkipDefaultMaxApplyForAllocatedQuantity(candidate, input.defaultMaxTotalQuantity)) {
      skippedBelowAllocatedCount += 1;
      continue;
    }

    toUpdate.push({ id: docSnap.id });
  }

  let updatedShowCount = 0;
  const chunks = chunkIds(toUpdate, batchSize);

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex += 1) {
    const chunk = chunks[chunkIndex]!;
    const batch = input.db.batch();

    for (const show of chunk) {
      const showRef = input.db.collection("upcomingShows").doc(show.id);
      const showPayload: Record<string, unknown> = {
        maxQuantityOverridden: false,
        updatedBy: input.callerUid,
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (input.defaultMaxTotalQuantity === null) {
        showPayload.maxTotalQuantity = FieldValue.delete();
      } else {
        showPayload.maxTotalQuantity = input.defaultMaxTotalQuantity;
      }

      batch.update(showRef, showPayload);
    }

    try {
      await batch.commit();
      updatedShowCount += chunk.length;
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim()
          ? error.message
          : "Failed to update one or more eligible shows.";
      const details: ApplyShowQueueDefaultMaxPartialFailureDetails = {
        updatedShowCount,
        skippedBelowAllocatedCount,
        failedChunkIndex: chunkIndex,
        message: `Show Queue default max was saved, but only ${updatedShowCount} of ${toUpdate.length} eligible shows were updated before a batch failed: ${message}`,
      };
      throw failedPrecondition(details.message, details);
    }
  }

  return {
    defaultMaxTotalQuantity: input.defaultMaxTotalQuantity,
    updatedShowCount,
    skippedBelowAllocatedCount,
  };
}
