import { FieldValue, Timestamp } from "firebase-admin/firestore";

import {
  CATALOG_REPROCESS_JOBS_COLLECTION,
  CATALOG_REPROCESS_LEASE_MS,
  CATALOG_REPROCESS_MAX_ATTEMPTS,
} from "../../../packages/shared/src/constants/catalogReprocess.constants";
import type { CatalogReprocessJobStatus } from "../../../packages/shared/src/constants/catalogReprocess.constants";
import { adminDb } from "../lib/admin";

export function canClaimCatalogReprocessJob(input: {
  status: unknown;
  attemptCount: unknown;
  leaseExpiresAtMs?: number;
  pauseRequested?: boolean;
  nowMs: number;
}): boolean {
  if (input.pauseRequested === true) {
    return false;
  }
  const attempts = Number.isInteger(input.attemptCount) ? Number(input.attemptCount) : 0;
  if (attempts >= CATALOG_REPROCESS_MAX_ATTEMPTS) {
    return false;
  }
  if (input.status === "pending") {
    return true;
  }
  return input.status === "running" && (input.leaseExpiresAtMs ?? 0) <= input.nowMs;
}

export async function findActiveCatalogReprocessJobId(
  projectId: string,
  targetType: string,
): Promise<string | null> {
  const activeStatuses: CatalogReprocessJobStatus[] = ["pending", "running", "paused"];
  const snapshot = await adminDb
    .collection(CATALOG_REPROCESS_JOBS_COLLECTION)
    .where("projectId", "==", projectId)
    .where("targetType", "==", targetType)
    .where("status", "in", activeStatuses)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }
  return snapshot.docs[0]?.id ?? null;
}

export async function claimCatalogReprocessJob(
  jobId: string,
  leaseOwner: string,
): Promise<{ claimed: boolean; pauseRequested: boolean }> {
  const ref = adminDb.collection(CATALOG_REPROCESS_JOBS_COLLECTION).doc(jobId);
  return adminDb.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) {
      return { claimed: false, pauseRequested: false };
    }
    const data = snapshot.data()!;
    if (data.pauseRequested === true) {
      tx.update(ref, {
        status: "paused",
        leaseOwner: FieldValue.delete(),
        leaseExpiresAt: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { claimed: false, pauseRequested: true };
    }

    const leaseExpiresAt = data.leaseExpiresAt as Timestamp | undefined;
    if (
      !canClaimCatalogReprocessJob({
        status: data.status,
        attemptCount: data.attemptCount,
        leaseExpiresAtMs: leaseExpiresAt?.toMillis(),
        pauseRequested: data.pauseRequested === true,
        nowMs: Date.now(),
      })
    ) {
      return { claimed: false, pauseRequested: false };
    }

    const attemptCount = Number.isInteger(data.attemptCount) ? Number(data.attemptCount) + 1 : 1;
    if (attemptCount > CATALOG_REPROCESS_MAX_ATTEMPTS) {
      tx.update(ref, {
        status: "failed",
        lastError: "attempts_exhausted",
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { claimed: false, pauseRequested: false };
    }

    tx.update(ref, {
      status: "running",
      attemptCount,
      leaseOwner,
      leaseExpiresAt: Timestamp.fromMillis(Date.now() + CATALOG_REPROCESS_LEASE_MS),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { claimed: true, pauseRequested: false };
  });
}
