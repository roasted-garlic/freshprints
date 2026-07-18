import { onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";

import {
  ASSISTED_CREATION_APPROVED_PROOF_RETENTION_DAYS,
  ASSISTED_CREATION_COLLECTION,
} from "../../packages/shared/src/constants/assistedCreation/assistedCreation.constants";
import type { AssistedCreationProof } from "../../packages/shared/src/types/assistedCreation/assistedCreation.types";
import { evaluateAssistedCreationApprovedProofPurge } from "../../packages/shared/src/utils/assistedCreationApprovedProofRetention";

import { adminDb } from "./lib/admin";
import {
  proofsToRetentionViews,
  purgeAssistedCreationProofFullSizeByIds,
  purgeAssistedCreationProofsForTerminal,
  timestampMillis,
} from "./lib/assistedCreationProofPurge";
import { assertStaffCaller, loadCallerProfile } from "./lib/caller";
import { invalidArgument, permissionDenied, unauthenticated } from "./lib/errors";

const SCAN_LIMIT = 100;
const PURGE_CAP = 50;

export interface PurgeExpiredAssistedCreationProofsRequest {
  dryRun?: boolean;
}

export interface PurgeExpiredAssistedCreationProofsItemResult {
  requestId: string;
  kind: "approved_expired" | "terminal_orphan";
  reason: string;
  purged: boolean;
  storageFilesDeleted?: number;
  proofIds?: string[];
}

export interface PurgeExpiredAssistedCreationProofsResponse {
  dryRun: boolean;
  retentionDays: number;
  scanned: number;
  purgedCount: number;
  results: PurgeExpiredAssistedCreationProofsItemResult[];
}

function assertOwnerAdmin(caller: Awaited<ReturnType<typeof loadCallerProfile>>): void {
  if (!caller.isActive || !["owner", "admin"].includes(caller.role)) {
    throw permissionDenied("Only owners and admins can purge assisted creation proof files.");
  }
}

function parseRequest(data: unknown): PurgeExpiredAssistedCreationProofsRequest {
  if (data == null) {
    return { dryRun: false };
  }
  if (typeof data !== "object") {
    throw invalidArgument("Request data must be an object.");
  }
  return { dryRun: Boolean((data as { dryRun?: unknown }).dryRun) };
}

async function runPurge(dryRun: boolean): Promise<PurgeExpiredAssistedCreationProofsResponse> {
  const nowMs = Date.now();
  const results: PurgeExpiredAssistedCreationProofsItemResult[] = [];
  let scanned = 0;
  let purgedCount = 0;

  const approvedSnap = await adminDb
    .collection(ASSISTED_CREATION_COLLECTION)
    .where("status", "==", "approved")
    .limit(SCAN_LIMIT)
    .get();

  for (const docSnap of approvedSnap.docs) {
    if (purgedCount >= PURGE_CAP) {
      break;
    }
    scanned += 1;
    const data = docSnap.data() ?? {};
    const proofs = Array.isArray(data.proofs) ? (data.proofs as AssistedCreationProof[]) : [];
    const evaluation = evaluateAssistedCreationApprovedProofPurge({
      status: "approved",
      approvedProofId: typeof data.approvedProofId === "string" ? data.approvedProofId : null,
      approvedAtMillis: timestampMillis(data.approvedAt),
      proofs: proofsToRetentionViews(proofs),
      nowMs,
    });

    if (!evaluation.eligible || !evaluation.proof) {
      results.push({
        requestId: docSnap.id,
        kind: "approved_expired",
        reason: evaluation.reason,
        purged: false,
      });
      continue;
    }

    if (dryRun) {
      results.push({
        requestId: docSnap.id,
        kind: "approved_expired",
        reason: evaluation.reason,
        purged: true,
        proofIds: [evaluation.proof.id],
      });
      purgedCount += 1;
      continue;
    }

    const { storageFilesDeleted } = await purgeAssistedCreationProofFullSizeByIds({
      docRef: docSnap.ref,
      proofs,
      proofIds: [evaluation.proof.id],
    });
    results.push({
      requestId: docSnap.id,
      kind: "approved_expired",
      reason: evaluation.reason,
      purged: true,
      storageFilesDeleted,
      proofIds: [evaluation.proof.id],
    });
    purgedCount += 1;
  }

  for (const status of ["rejected", "cancelled"] as const) {
    if (purgedCount >= PURGE_CAP) {
      break;
    }
    const snap = await adminDb
      .collection(ASSISTED_CREATION_COLLECTION)
      .where("status", "==", status)
      .limit(SCAN_LIMIT)
      .get();

    for (const docSnap of snap.docs) {
      if (purgedCount >= PURGE_CAP) {
        break;
      }
      scanned += 1;
      const data = docSnap.data() ?? {};
      const proofs = Array.isArray(data.proofs) ? (data.proofs as AssistedCreationProof[]) : [];
      const orphanIds = proofs
        .filter(
          (proof) =>
            proof.fullSizePurgedAt == null &&
            typeof proof.storagePath === "string" &&
            proof.storagePath.trim(),
        )
        .map((proof) => proof.id);

      if (orphanIds.length === 0) {
        results.push({
          requestId: docSnap.id,
          kind: "terminal_orphan",
          reason: "already_purged",
          purged: false,
        });
        continue;
      }

      if (dryRun) {
        results.push({
          requestId: docSnap.id,
          kind: "terminal_orphan",
          reason: "eligible",
          purged: true,
          proofIds: orphanIds,
        });
        purgedCount += 1;
        continue;
      }

      const { storageFilesDeleted, purgedProofIds } = await purgeAssistedCreationProofsForTerminal({
        docRef: docSnap.ref,
        proofs,
        terminalKind: "rejected_or_cancelled",
      });
      results.push({
        requestId: docSnap.id,
        kind: "terminal_orphan",
        reason: "eligible",
        purged: true,
        storageFilesDeleted,
        proofIds: purgedProofIds,
      });
      purgedCount += 1;
    }
  }

  return {
    dryRun,
    retentionDays: ASSISTED_CREATION_APPROVED_PROOF_RETENTION_DAYS,
    scanned,
    purgedCount,
    results,
  };
}

/**
 * Owner/admin callable — purge approved proof full-res after 14 days and
 * orphan full-res leftovers on rejected/cancelled requests.
 */
export const purgeExpiredAssistedCreationProofs = onCall(
  { timeoutSeconds: 540, memory: "512MiB" },
  async (request): Promise<PurgeExpiredAssistedCreationProofsResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    const caller = await loadCallerProfile(request.auth.uid);
    assertStaffCaller(caller);
    assertOwnerAdmin(caller);
    const payload = parseRequest(request.data);
    return runPurge(payload.dryRun === true);
  },
);

/** Daily cleanup for assisted creation proof full-res retention (ADR-FP-093). */
export const purgeExpiredAssistedCreationProofsScheduled = onSchedule(
  {
    schedule: "every 24 hours",
    timeZone: "America/Chicago",
    timeoutSeconds: 540,
    memory: "512MiB",
  },
  async () => {
    await runPurge(false);
  },
);
