import {
  CUSTOMER_UPLOAD_MAX_CONCURRENT_FINALIZE,
  CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES,
  computeCustomerUploadMaxZipBytes,
} from "../../../packages/shared/src/constants/customerUpload/customerUploadLimits.constants";
import type { GetCustomerUploadDailyQuotaResponse } from "../../../packages/shared/src/types/customerUpload/customerUploadDailyQuota.types";
import type { CustomerUploadPurpose } from "../../../packages/shared/src/types/customerUpload/customerUpload.enums";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { adminDb } from "./admin";
import {
  quotaExhaustedMessage,
  resolveDailyQuotaTarget,
  shouldChargeDailyQuota,
  type CustomerUploadQuotaKind,
} from "./customerUploadDailyQuota";
import {
  rateLimitDocId,
  utcDayKey,
  utcDayLabel,
} from "./customerUploadRateLimitHelpers";
import { resourceExhausted } from "./errors";
import { loadCustomerUploadQuotaSettings } from "./loadCustomerUploadQuotaSettings";

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
  if (!shouldChargeDailyQuota(kind, purpose)) {
    return;
  }

  const dayKey = utcDayKey();
  const ref = adminDb.collection("customerUploadRateLimits").doc(rateLimitDocId(customerUid, dayKey));
  const settings = await loadCustomerUploadQuotaSettings();
  const { field, limit } = resolveDailyQuotaTarget(kind, purpose, settings);

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

function toQuotaBucket(used: number, limit: number): {
  used: number;
  limit: number;
  remaining: number;
} {
  const safeUsed = Number.isFinite(used) && used > 0 ? Math.floor(used) : 0;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 0;
  return {
    used: safeUsed,
    limit: safeLimit,
    remaining: Math.max(0, safeLimit - safeUsed),
  };
}

/**
 * Read today's purpose-scoped quota usage without charging.
 * Rate-limit docs are client-denied; call only from trusted callables.
 */
export async function readDailyQuota(
  customerUid: string,
  purpose: CustomerUploadPurpose = "print_request",
): Promise<GetCustomerUploadDailyQuotaResponse> {
  const dayKey = utcDayKey();
  const settings = await loadCustomerUploadQuotaSettings();
  const uploadStartsTarget = resolveDailyQuotaTarget("createBatch", purpose, settings);
  const imagesTarget = resolveDailyQuotaTarget("finalizeImage", purpose, settings);
  const zipsTarget = resolveDailyQuotaTarget("finalizeZip", purpose, settings);

  const ref = adminDb.collection("customerUploadRateLimits").doc(rateLimitDocId(customerUid, dayKey));
  const snap = await ref.get();
  const data = snap.exists ? snap.data() ?? {} : {};
  const images = toQuotaBucket(Number(data[imagesTarget.field] ?? 0), imagesTarget.limit);

  return {
    purpose,
    utcDay: utcDayLabel(),
    uploadStarts: toQuotaBucket(
      Number(data[uploadStartsTarget.field] ?? 0),
      uploadStartsTarget.limit,
    ),
    images,
    zips: toQuotaBucket(Number(data[zipsTarget.field] ?? 0), zipsTarget.limit),
    maxSingleImageBytes: CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES,
    maxZipBytes: computeCustomerUploadMaxZipBytes(),
    maxConcurrentFinalize: CUSTOMER_UPLOAD_MAX_CONCURRENT_FINALIZE,
  };
}
