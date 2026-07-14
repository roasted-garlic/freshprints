import { FieldValue, Timestamp, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import {
  isRejectedDesignEligibleForAutoArchive,
  REJECTED_DESIGN_AUTO_ARCHIVE_AFTER_DAYS,
} from "../../packages/shared/src/utils/rejectedDesignAutoArchive";

import { adminDb } from "./lib/admin";
import { assertStaffCaller, loadCallerProfile } from "./lib/caller";
import { invalidArgument, permissionDenied, unauthenticated } from "./lib/errors";

const SCAN_LIMIT = 150;

export interface ArchiveStaleRejectedDesignsRequest {
  dryRun?: boolean;
}

export interface ArchiveStaleRejectedDesignsResponse {
  dryRun: boolean;
  staleAfterDays: number;
  cutoffIso: string;
  scanned: number;
  archivedCount: number;
  designIds: string[];
}

function assertOwnerAdmin(caller: Awaited<ReturnType<typeof loadCallerProfile>>): void {
  if (!caller.isActive || !["owner", "admin"].includes(caller.role)) {
    throw permissionDenied("Only owners and admins can auto-archive rejected designs.");
  }
}

function parseRequest(data: unknown): ArchiveStaleRejectedDesignsRequest {
  if (data == null) {
    return { dryRun: false };
  }
  if (typeof data !== "object") {
    throw invalidArgument("Request data must be an object.");
  }
  return { dryRun: Boolean((data as { dryRun?: unknown }).dryRun) };
}

function timestampMillis(value: unknown): number | null {
  if (value instanceof Timestamp) {
    return value.toMillis();
  }
  return null;
}

/**
 * Soft-archives designs that have been rejected for ≥ 7 days (ADR-FP-086 §2).
 */
export const archiveStaleRejectedDesigns = onCall(
  async (request): Promise<ArchiveStaleRejectedDesignsResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    const caller = await loadCallerProfile(request.auth.uid);
    assertStaffCaller(caller);
    assertOwnerAdmin(caller);

    const payload = parseRequest(request.data);
    const nowMs = Date.now();
    const cutoffMs = nowMs - REJECTED_DESIGN_AUTO_ARCHIVE_AFTER_DAYS * 24 * 60 * 60 * 1000;
    const cutoff = Timestamp.fromMillis(cutoffMs);

    const byAiReviewedAt = await adminDb
      .collection("designs")
      .where("status", "==", "rejected")
      .where("aiReviewedAt", "<", cutoff)
      .limit(SCAN_LIMIT)
      .get();

    const byUpdatedAt = await adminDb
      .collection("designs")
      .where("status", "==", "rejected")
      .where("updatedAt", "<", cutoff)
      .limit(SCAN_LIMIT)
      .get();

    const docsById = new Map<string, QueryDocumentSnapshot>();
    for (const docSnap of [...byAiReviewedAt.docs, ...byUpdatedAt.docs]) {
      docsById.set(docSnap.id, docSnap);
    }

    const designIds: string[] = [];
    let scanned = 0;

    for (const docSnap of docsById.values()) {
      scanned += 1;
      const data = docSnap.data() ?? {};
      if (
        !isRejectedDesignEligibleForAutoArchive({
          status: typeof data.status === "string" ? data.status : "",
          aiReviewedAtMillis: timestampMillis(data.aiReviewedAt),
          updatedAtMillis: timestampMillis(data.updatedAt),
          nowMs,
        })
      ) {
        continue;
      }

      designIds.push(docSnap.id);
    }

    if (!payload.dryRun) {
      let batch = adminDb.batch();
      let ops = 0;

      for (const designId of designIds) {
        const ref = adminDb.collection("designs").doc(designId);
        batch.update(ref, {
          status: "archived",
          previousStatus: "rejected",
          archivedAt: FieldValue.serverTimestamp(),
          archivedBy: caller.id,
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: caller.id,
        });
        ops += 1;

        if (ops >= 400) {
          await batch.commit();
          batch = adminDb.batch();
          ops = 0;
        }
      }

      if (ops > 0) {
        await batch.commit();
      }
    }

    return {
      dryRun: payload.dryRun === true,
      staleAfterDays: REJECTED_DESIGN_AUTO_ARCHIVE_AFTER_DAYS,
      cutoffIso: new Date(cutoffMs).toISOString(),
      scanned,
      archivedCount: designIds.length,
      designIds,
    };
  },
);
