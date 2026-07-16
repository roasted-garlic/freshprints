import { CUSTOMER_UPLOAD_MAX_CONCURRENT_FINALIZE } from "../../../packages/shared/src/constants/customerUpload/customerUploadLimits.constants";
import type { CustomerUploadPurpose } from "../../../packages/shared/src/types/customerUpload/customerUpload.enums";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { adminDb } from "./admin";
import {
  quotaExhaustedMessage,
  resolveDailyQuotaTarget,
  type CustomerUploadQuotaKind,
} from "./customerUploadDailyQuota";
import {
  rateLimitDocId,
  utcDayKey,
  utcDayLabel,
} from "./customerUploadRateLimitHelpers";
import { resourceExhausted } from "./errors";

export type { CustomerUploadQuotaKind } from "./customerUploadDailyQuota";

export {
  isLeaseExpired,
  rateLimitDocId,
  utcDayKey,
  utcDayLabel,
} from "./customerUploadRateLimitHelpers";

const LEASE_TTL_MS = 4 * 60 * 1000;

/**
 * Increments a purpose-scoped daily quota counter in a transaction.
 * Call only when charging a new logical operation (not idempotent replays).
 */
export async function chargeDailyQuota(
  customerUid: string,
  kind: CustomerUploadQuotaKind,
  purpose: CustomerUploadPurpose = "print_request",
): Promise<void> {
  const dayKey = utcDayKey();
  const ref = adminDb.collection("customerUploadRateLimits").doc(rateLimitDocId(customerUid, dayKey));
  const { field, limit } = resolveDailyQuotaTarget(kind, purpose);

  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists ? Number(snap.data()?.[field] ?? 0) : 0;
    if (current >= limit) {
      throw resourceExhausted(quotaExhaustedMessage(kind, limit, purpose));
    }

    if (!snap.exists) {
      tx.set(ref, {
        customerUid,
        utcDay: utcDayLabel(),
        createBatchCount: 0,
        finalizeImageCount: 0,
        finalizeZipCount: 0,
        createBatchCountDonation: 0,
        finalizeImageCountDonation: 0,
        finalizeZipCountDonation: 0,
        [field]: 1,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return;
    }

    tx.update(ref, {
      [field]: current + 1,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

export async function acquireFinalizeLease(input: {
  customerUid: string;
  kind: "image" | "zip";
  targetId: string;
}): Promise<string> {
  const now = new Date();
  const expiresAt = Timestamp.fromMillis(now.getTime() + LEASE_TTL_MS);
  const leasesRef = adminDb.collection("customerUploadFinalizeLeases");

  return adminDb.runTransaction(async (tx) => {
    const existing = await tx.get(
      leasesRef.where("customerUid", "==", input.customerUid).where("expiresAt", ">", Timestamp.fromDate(now)),
    );

    if (existing.size >= CUSTOMER_UPLOAD_MAX_CONCURRENT_FINALIZE) {
      throw resourceExhausted(
        "Too many uploads are processing at once. Please wait and try again.",
      );
    }

    const leaseRef = leasesRef.doc();
    tx.set(leaseRef, {
      customerUid: input.customerUid,
      kind: input.kind,
      targetId: input.targetId,
      acquiredAt: FieldValue.serverTimestamp(),
      expiresAt,
    });
    return leaseRef.id;
  });
}

export async function releaseFinalizeLease(leaseId: string | null | undefined): Promise<void> {
  if (!leaseId) {
    return;
  }
  await adminDb.collection("customerUploadFinalizeLeases").doc(leaseId).delete().catch(() => undefined);
}
