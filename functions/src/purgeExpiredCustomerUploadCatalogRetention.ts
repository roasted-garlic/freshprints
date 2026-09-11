import { FieldPath, Timestamp, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";

import { CUSTOMER_UPLOAD_COLLECTIONS } from "../../packages/shared/src/constants/customerUpload/customerUploadCollections.constants";
import {
  CUSTOMER_UPLOAD_UNPROMOTED_DONATION_RETENTION_REASON,
  isCustomerUploadCatalogRetentionEpisodeDue,
  resolveCustomerUploadCatalogRetentionQueryCutoffDays,
} from "../../packages/shared/src/utils/customerUploadCatalogRetention";
import {
  isActiveShowAllocationStatus,
} from "../../packages/shared/src/utils/customerUploadFullSizeRetention";

import {
  buildPreview,
  executeEligibleHardDelete,
} from "./deleteEligibleCustomerUpload";
import { adminDb } from "./lib/admin";
import { assertStaffCaller, loadCallerProfile } from "./lib/caller";
import { unauthenticated, permissionDenied } from "./lib/errors";

const PAGE_SIZE = 100;
const DEFAULT_MAX_PER_RUN = 50;

export type CustomerUploadCatalogRetentionOutcome =
  | "eligible"
  | "deleted"
  | "deferred-reference"
  | "deferred-follow-up"
  | "invalid-manifest"
  | "failed/retryable";

export interface CustomerUploadCatalogRetentionRowResult {
  uploadId: string;
  outcome: CustomerUploadCatalogRetentionOutcome;
}

export interface CustomerUploadCatalogRetentionRunResult {
  dryRun: boolean;
  scanned: number;
  eligible: number;
  deleted: number;
  deferredReference: number;
  deferredFollowUp: number;
  invalidManifest: number;
  failedRetryable: number;
  results: CustomerUploadCatalogRetentionRowResult[];
  nextCursor: string | null;
}

function retentionTimestampMillis(value: unknown): number | null {
  return value instanceof Timestamp ? value.toMillis() : null;
}

function encodeCursor(retentionStartedAtMs: number, uploadId: string): string {
  return Buffer.from(JSON.stringify({ retentionStartedAtMs, uploadId }), "utf8").toString("base64url");
}

function decodeCursor(cursor: string | undefined): { retentionStartedAtMs: number; uploadId: string } | null {
  if (!cursor) {
    return null;
  }
  try {
    const value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as Record<string, unknown>;
    if (
      typeof value.retentionStartedAtMs !== "number" ||
      !Number.isFinite(value.retentionStartedAtMs) ||
      typeof value.uploadId !== "string" ||
      !value.uploadId.trim()
    ) {
      return null;
    }
    return { retentionStartedAtMs: value.retentionStartedAtMs, uploadId: value.uploadId.trim() };
  } catch {
    return null;
  }
}

async function hasActiveProductionDependency(uploadId: string): Promise<boolean> {
  const snapshot = await adminDb
    .collection("showAllocations")
    .where("customerUploadId", "==", uploadId)
    .limit(50)
    .get();
  return snapshot.docs.some((entry) => {
    const status = entry.data()?.status;
    return typeof status === "string" && isActiveShowAllocationStatus(status);
  });
}

function classifyBlockedOutcome(code: string | undefined): CustomerUploadCatalogRetentionOutcome {
  return code === "invalid_asset_manifest" ? "invalid-manifest" : "deferred-reference";
}

type RetentionCounters = {
  eligible: number;
  deleted: number;
  deferredReference: number;
  deferredFollowUp: number;
  invalidManifest: number;
  failedRetryable: number;
  results: CustomerUploadCatalogRetentionRowResult[];
};

function isRetentionCandidateReason(reason: unknown): boolean {
  return (
    reason === "staff_review" ||
    reason === "customer_permission_denied" ||
    reason === CUSTOMER_UPLOAD_UNPROMOTED_DONATION_RETENTION_REASON
  );
}

async function processRetentionCandidate(
  uploadDoc: QueryDocumentSnapshot,
  options: { dryRun: boolean; nowMs: number },
  counters: RetentionCounters,
): Promise<void> {
  try {
    const data = uploadDoc.data() ?? {};
    const reason = data.catalogExclusionReason;
    if (!isRetentionCandidateReason(reason)) {
      return;
    }

    if (
      typeof data.promotedDesignId === "string" &&
      data.promotedDesignId.trim()
    ) {
      return;
    }

    if (reason === "customer_permission_denied" && data.catalogPermissionFollowUpStatus === "requested") {
      counters.deferredFollowUp += 1;
      counters.results.push({ uploadId: uploadDoc.id, outcome: "deferred-follow-up" });
      return;
    }

    const retentionStartedAtMs = retentionTimestampMillis(data.catalogRetentionStartedAt);
    if (
      !isCustomerUploadCatalogRetentionEpisodeDue({
        catalogExclusionReason: reason,
        catalogRetentionStartedAtMs: retentionStartedAtMs,
        nowMs: options.nowMs,
      })
    ) {
      return;
    }

    if (await hasActiveProductionDependency(uploadDoc.id)) {
      counters.deferredReference += 1;
      counters.results.push({ uploadId: uploadDoc.id, outcome: "deferred-reference" });
      return;
    }

    const preview = await buildPreview(uploadDoc.id);
    if (preview.outcome !== "allowed_hard_delete") {
      const outcome = classifyBlockedOutcome(preview.blockers[0]?.code);
      if (outcome === "invalid-manifest") {
        counters.invalidManifest += 1;
      } else {
        counters.deferredReference += 1;
      }
      counters.results.push({ uploadId: uploadDoc.id, outcome });
      return;
    }

    counters.eligible += 1;
    if (options.dryRun) {
      counters.results.push({ uploadId: uploadDoc.id, outcome: "eligible" });
      return;
    }

    const deletion = await executeEligibleHardDelete(uploadDoc.id);
    if (deletion.outcome === "allowed_hard_delete" || deletion.outcome === "already_done") {
      counters.deleted += 1;
      counters.results.push({ uploadId: uploadDoc.id, outcome: "deleted" });
    } else if (deletion.outcome === "blocked") {
      const outcome = classifyBlockedOutcome(deletion.blockers?.[0]?.code);
      if (outcome === "invalid-manifest") {
        counters.invalidManifest += 1;
      } else {
        counters.deferredReference += 1;
      }
      counters.results.push({ uploadId: uploadDoc.id, outcome });
    } else {
      counters.failedRetryable += 1;
      counters.results.push({ uploadId: uploadDoc.id, outcome: "failed/retryable" });
    }
  } catch {
    counters.failedRetryable += 1;
    counters.results.push({ uploadId: uploadDoc.id, outcome: "failed/retryable" });
  }
}

/**
 * Bounded retention page for Denied/staff-Excluded plus unpromoted donations (30d).
 * Admin hard-delete helper remains the single deletion authority.
 */
export async function runExpiredCustomerUploadCatalogRetention(options?: {
  dryRun?: boolean;
  cursor?: string;
  maxPerRun?: number;
  nowMs?: number;
}): Promise<CustomerUploadCatalogRetentionRunResult> {
  const dryRun = options?.dryRun === true;
  const maxPerRun = Math.max(1, Math.min(options?.maxPerRun ?? DEFAULT_MAX_PER_RUN, PAGE_SIZE));
  const nowMs = options?.nowMs ?? Date.now();
  // Shortest clock (staff 14d) so Excluded rows are scanned; personal/donation still wait 30d per row.
  const queryCutoffDays = resolveCustomerUploadCatalogRetentionQueryCutoffDays();
  const cutoff = Timestamp.fromMillis(nowMs - queryCutoffDays * 24 * 60 * 60 * 1000);
  const cursor = decodeCursor(options?.cursor);

  let excludedQuery = adminDb
    .collection(CUSTOMER_UPLOAD_COLLECTIONS.customerUploads)
    .where("catalogReviewStatus", "==", "excluded_from_catalog")
    .where("catalogRetentionStartedAt", "<=", cutoff)
    .orderBy("catalogRetentionStartedAt", "asc")
    .orderBy(FieldPath.documentId(), "asc")
    .limit(Math.min(PAGE_SIZE, maxPerRun));

  if (cursor) {
    excludedQuery = excludedQuery.startAfter(
      Timestamp.fromMillis(cursor.retentionStartedAtMs),
      cursor.uploadId,
    );
  }

  // Unpromoted donations stay pending_staff_review; scan by retention reason (no shared cursor).
  const donationQuery = adminDb
    .collection(CUSTOMER_UPLOAD_COLLECTIONS.customerUploads)
    .where("catalogExclusionReason", "==", CUSTOMER_UPLOAD_UNPROMOTED_DONATION_RETENTION_REASON)
    .where("catalogRetentionStartedAt", "<=", cutoff)
    .orderBy("catalogRetentionStartedAt", "asc")
    .orderBy(FieldPath.documentId(), "asc")
    .limit(Math.min(PAGE_SIZE, maxPerRun));

  const [excludedSnap, donationSnap] = await Promise.all([excludedQuery.get(), donationQuery.get()]);

  const counters: RetentionCounters = {
    eligible: 0,
    deleted: 0,
    deferredReference: 0,
    deferredFollowUp: 0,
    invalidManifest: 0,
    failedRetryable: 0,
    results: [],
  };

  const seen = new Set<string>();
  for (const uploadDoc of [...excludedSnap.docs, ...donationSnap.docs]) {
    if (seen.has(uploadDoc.id)) {
      continue;
    }
    seen.add(uploadDoc.id);
    await processRetentionCandidate(uploadDoc, { dryRun, nowMs }, counters);
  }

  const last = excludedSnap.docs.at(-1);
  const lastRetentionMs = last ? retentionTimestampMillis(last.data()?.catalogRetentionStartedAt) : null;
  return {
    dryRun,
    scanned: seen.size,
    eligible: counters.eligible,
    deleted: counters.deleted,
    deferredReference: counters.deferredReference,
    deferredFollowUp: counters.deferredFollowUp,
    invalidManifest: counters.invalidManifest,
    failedRetryable: counters.failedRetryable,
    results: counters.results,
    nextCursor:
      excludedSnap.size >= Math.min(PAGE_SIZE, maxPerRun) && last && lastRetentionMs != null
        ? encodeCursor(lastRetentionMs, last.id)
        : null,
  };
}

function assertOwnerAdmin(caller: Awaited<ReturnType<typeof loadCallerProfile>>): void {
  if (!caller.isActive || (caller.role !== "owner" && caller.role !== "admin")) {
    throw permissionDenied("Only owners and admins can run customer-upload retention cleanup.");
  }
}

/** Owner/admin dry-run and bounded execution entry point for operational verification. */
export const purgeExpiredCustomerUploadCatalogRetention = onCall(
  async (request): Promise<CustomerUploadCatalogRetentionRunResult> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    const caller = await loadCallerProfile(request.auth.uid);
    assertStaffCaller(caller);
    assertOwnerAdmin(caller);
    const data = request.data && typeof request.data === "object"
      ? request.data as Record<string, unknown>
      : {};
    return runExpiredCustomerUploadCatalogRetention({
      dryRun: data.dryRun === true,
      cursor: typeof data.cursor === "string" ? data.cursor : undefined,
      maxPerRun: typeof data.maxPerRun === "number" ? data.maxPerRun : undefined,
    });
  },
);

/** Daily bounded cleanup for Denied, staff-Excluded, and unpromoted-donation retention episodes. */
export const purgeExpiredCustomerUploadCatalogRetentionScheduled = onSchedule(
  {
    schedule: "every 24 hours",
    timeZone: "America/Chicago",
    timeoutSeconds: 540,
    memory: "512MiB",
  },
  async () => {
    await runExpiredCustomerUploadCatalogRetention({ dryRun: false });
  },
);
