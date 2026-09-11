import { FieldValue, type DocumentSnapshot, type Transaction } from "firebase-admin/firestore";

import { CUSTOMER_UPLOAD_COLLECTIONS } from "../../../packages/shared/src/constants/customerUpload/customerUploadCollections.constants";
import { isCustomerUploadEligibleForCatalogIntake } from "../../../packages/shared/src/utils/customerUploadCatalogIntakeEligibility";

import { adminDb } from "./admin";

/**
 * Shared confirmation fields when a customer confirms ownership / library consent.
 *
 * - Print-request attach / assisted: affirmative consent reaffirms `not_eligible` (Studio Pending
 *   waits for successful show allocation / Add to Show); explicit denial is Excluded.
 * - Donate confirm: set `pending_staff_review` immediately (Donated Designs intake).
 */
export function buildCatalogIntakeConfirmationPatch(input: {
  catalogUseAcknowledged: boolean;
  termsVersion: string;
  printRequestId: string | null;
  /**
   * When true (donate), sets `pending_staff_review`.
   * When false (print-request attach / assisted), records catalog exclusion unless a prior
   * follow-up approval is already present.
   */
  submitForStaffReview: boolean;
  /** Existing upload data is used to preserve follow-up history on retries/re-attachments. */
  existingUpload?: {
    catalogPermissionOriginalDeniedAt?: unknown;
    catalogPermissionFollowUpStatus?: unknown;
  };
  now?: FieldValue;
}): Record<string, unknown> {
  const now = input.now ?? FieldValue.serverTimestamp();
  const followUpApproved = input.existingUpload?.catalogPermissionFollowUpStatus === "approved";
  return {
    ownershipConfirmed: true,
    catalogUseAcknowledged: input.catalogUseAcknowledged,
    termsVersion: input.termsVersion,
    confirmedAt: now,
    printRequestId: input.printRequestId,
    catalogReviewStatus:
      input.submitForStaffReview
        ? "pending_staff_review"
        : input.catalogUseAcknowledged
          ? "not_eligible"
          : followUpApproved
            ? "pending_staff_review"
            : "excluded_from_catalog",
    ...(input.submitForStaffReview || input.catalogUseAcknowledged
      ? {}
      : {
          catalogExclusionReason: "customer_permission_denied",
          ...(input.existingUpload?.catalogPermissionOriginalDeniedAt
            ? {}
            : { catalogPermissionOriginalDeniedAt: now }),
        }),
    updatedAt: now,
  };
}

/** Only `not_eligible` advances to Studio Pending; other statuses are one-way no-ops. */
export function shouldAdvanceCustomerUploadToStaffReview(
  catalogReviewStatus: unknown,
  catalogUseAcknowledged?: unknown,
): boolean {
  if (
    !isCustomerUploadEligibleForCatalogIntake({
      catalogUseAcknowledged:
        typeof catalogUseAcknowledged === "boolean" ? catalogUseAcknowledged : null,
    })
  ) {
    return false;
  }
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
  const data = uploadSnap.data() ?? {};
  if (
    !shouldAdvanceCustomerUploadToStaffReview(
      data.catalogReviewStatus,
      data.catalogUseAcknowledged,
    )
  ) {
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
