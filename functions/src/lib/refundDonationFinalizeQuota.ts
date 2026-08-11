import {
  FieldValue,
  type DocumentReference,
  type DocumentSnapshot,
  type Transaction,
} from "firebase-admin/firestore";

import { resolveCustomerUploadPurpose } from "../../../packages/shared/src/utils/customerUploadPurpose";

import { adminDb } from "./admin";
import { rateLimitDocId, utcDayKey } from "./customerUploadRateLimitHelpers";

/**
 * True when a hard-deleted upload should release one donation finalize/day slot.
 * Cap L / print_request uploads never refund day counters.
 */
export function shouldRefundDonationFinalizeQuota(data: Record<string, unknown>): boolean {
  if (resolveCustomerUploadPurpose(data.purpose) !== "catalog_donation") {
    return false;
  }
  return data.quotaChargedFinalize === true;
}

export function donationFinalizeQuotaRateLimitRef(
  customerUid: string,
  dayKey: string = utcDayKey(),
): DocumentReference {
  return adminDb.collection("customerUploadRateLimits").doc(rateLimitDocId(customerUid, dayKey));
}

/**
 * Decrement today's `finalizeImageCountDonation` by 1 (never below 0) inside an open
 * transaction. Caller must `transaction.get` the rate-limit doc before any writes.
 * No-ops when the rate-limit doc is missing (nothing to refund).
 */
export function applyDonationFinalizeQuotaRefundInTransaction(
  transaction: Transaction,
  rateLimitSnap: DocumentSnapshot,
  rateLimitRef: DocumentReference,
): void {
  if (!rateLimitSnap.exists) {
    return;
  }
  const current = Number(rateLimitSnap.data()?.finalizeImageCountDonation ?? 0);
  const safeCurrent = Number.isFinite(current) && current > 0 ? Math.floor(current) : 0;
  const next = Math.max(0, safeCurrent - 1);
  transaction.update(rateLimitRef, {
    finalizeImageCountDonation: next,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Resolve ownership + refund eligibility from pre-delete upload fields.
 * Returns null when no day-counter refund applies.
 */
export function resolveDonationFinalizeQuotaRefundTarget(
  data: Record<string, unknown>,
): { customerUid: string; rateLimitRef: DocumentReference } | null {
  if (!shouldRefundDonationFinalizeQuota(data)) {
    return null;
  }
  const customerUid = typeof data.customerUid === "string" ? data.customerUid.trim() : "";
  if (!customerUid) {
    return null;
  }
  return {
    customerUid,
    rateLimitRef: donationFinalizeQuotaRateLimitRef(customerUid),
  };
}
