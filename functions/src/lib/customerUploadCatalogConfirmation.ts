import { FieldValue, type DocumentSnapshot, type Transaction } from "firebase-admin/firestore";

import { CUSTOMER_UPLOAD_COLLECTIONS } from "../../../packages/shared/src/constants/customerUpload/customerUploadCollections.constants";

import { adminDb } from "./admin";

/**
 * Shared confirmation fields when a customer confirms ownership / library consent.
 *
 * - Print-request attach / assisted: reaffirm `not_eligible` (Studio Pending waits for
 *   successful show allocation / Add to Show).
 * - Donate confirm: set `pending_staff_review` immediately (Donated Designs intake).
 */
export function buildCatalogIntakeConfirmationPatch(input: {
  catalogUseAcknowledged: boolean;
  termsVersion: string;
  printRequestId: string | null;
  /**
   * When true (donate), sets `pending_staff_review`.
   * When false (print-request attach / assisted), leaves / reaffirms `not_eligible`.
   */
  submitForStaffReview: boolean;
  now?: FieldValue;
}): Record<string, unknown> {
  const now = input.now ?? FieldValue.serverTimestamp();
  return {
    ownershipConfirmed: true,
    catalogUseAcknowledged: input.catalogUseAcknowledged,
    termsVersion: input.termsVersion,
    confirmedAt: now,
    printRequestId: input.printRequestId,
    catalogReviewStatus: input.submitForStaffReview ? "pending_staff_review" : "not_eligible",
    updatedAt: now,
  };
}

/** Only `not_eligible` advances to Studio Pending; other statuses are one-way no-ops. */
export function shouldAdvanceCustomerUploadToStaffReview(
  catalogReviewStatus: unknown,
): boolean {
  return catalogReviewStatus === "not_eligible";
}

export function buildCustomerUploadStaffReviewTransitionPatch(
  now?: FieldValue,
): Record<string, unknown> {
  const timestamp = now ?? FieldValue.serverTimestamp();
  return {
    catalogReviewStatus: "pending_staff_review",
    updatedAt: timestamp,
  };
}

export type CustomerUploadStaffReviewTransitionResult = "advanced" | "noop" | "missing";

/**
 * Idempotent in-transaction advance: `not_eligible` → `pending_staff_review`.
 * Caller must have already `transaction.get`'d the upload snapshot (reads before writes).
 */
export function applyCustomerUploadStaffReviewTransitionInTransaction(
  transaction: Transaction,
  uploadSnap: DocumentSnapshot,
  now?: FieldValue,
): CustomerUploadStaffReviewTransitionResult {
  if (!uploadSnap.exists) {
    return "missing";
  }
  const status = uploadSnap.data()?.catalogReviewStatus;
  if (!shouldAdvanceCustomerUploadToStaffReview(status)) {
    return "noop";
  }
  transaction.update(
    uploadSnap.ref,
    buildCustomerUploadStaffReviewTransitionPatch(now),
  );
  return "advanced";
}

/**
 * Standalone idempotent advance for allocation `onCreate` (Studio client allocate path)
 * and any other non-transactional callers. Never creates Designs or auto-promotes.
 */
export async function transitionCustomerUploadToStaffReviewIfEligible(
  uploadId: string,
): Promise<CustomerUploadStaffReviewTransitionResult> {
  const trimmed = uploadId.trim();
  if (!trimmed) {
    return "missing";
  }

  const uploadRef = adminDb.collection(CUSTOMER_UPLOAD_COLLECTIONS.customerUploads).doc(trimmed);

  return adminDb.runTransaction(async (transaction) => {
    const uploadSnap = await transaction.get(uploadRef);
    return applyCustomerUploadStaffReviewTransitionInTransaction(transaction, uploadSnap);
  });
}
