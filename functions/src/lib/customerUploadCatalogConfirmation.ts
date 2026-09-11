import { FieldValue, Timestamp, type DocumentSnapshot, type Transaction } from "firebase-admin/firestore";

import { CUSTOMER_UPLOAD_COLLECTIONS } from "../../../packages/shared/src/constants/customerUpload/customerUploadCollections.constants";
import { isCustomerUploadEligibleForCatalogIntake } from "../../../packages/shared/src/utils/customerUploadCatalogIntakeEligibility";
import { CUSTOMER_UPLOAD_UNPROMOTED_DONATION_RETENTION_REASON } from "../../../packages/shared/src/utils/customerUploadCatalogRetention";

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
    catalogRetentionStartedAt?: unknown;
    catalogPermissionFollowUpStatus?: unknown;
    catalogPermissionActivity?: unknown;
  };
  now?: FieldValue | Timestamp;
}): Record<string, unknown> {
  const now = input.now ?? FieldValue.serverTimestamp();
  const activityAt = input.now instanceof Timestamp ? input.now : Timestamp.now();
  const followUpApproved = input.existingUpload?.catalogPermissionFollowUpStatus === "approved";
  const denialPatch =
    input.submitForStaffReview || input.catalogUseAcknowledged || followUpApproved
      ? null
      : {
          catalogExclusionReason: "customer_permission_denied",
          studioIntakeHoldUntilShow: true,
          ...(input.existingUpload?.catalogPermissionOriginalDeniedAt
            ? {}
            : {
                catalogPermissionOriginalDeniedAt: now,
                catalogPermissionActivity: [
                  {
                    id: "initial_denial",
                    kind: "initial_denial",
                    // Concrete Timestamp only — FieldValue.serverTimestamp() is illegal inside arrays.
                    at: activityAt,
                    byUid: null,
                  },
                ],
              }),
          ...(input.existingUpload?.catalogRetentionStartedAt
            ? {}
            : { catalogRetentionStartedAt: now }),
        };

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
    ...(input.submitForStaffReview || input.catalogUseAcknowledged || followUpApproved
      ? input.submitForStaffReview
        ? { studioIntakeHoldUntilShow: FieldValue.delete() }
        : {
            catalogRetentionStartedAt: FieldValue.delete(),
            studioIntakeHoldUntilShow: FieldValue.delete(),
          }
      : denialPatch ?? {}),
    updatedAt: now,
  };
}

/**
 * Donation confirm: keep Pending intake, start 30-day unpromoted shelf-life clock once.
 * Does not flip status to Excluded.
 */
export function buildUnpromotedDonationRetentionPatch(input: {
  existingUpload?: {
    catalogRetentionStartedAt?: unknown;
    catalogExclusionReason?: unknown;
  };
  now?: FieldValue | Timestamp;
}): Record<string, unknown> {
  const now = input.now ?? FieldValue.serverTimestamp();
  const alreadyStarted = input.existingUpload?.catalogRetentionStartedAt != null;
  const reason = input.existingUpload?.catalogExclusionReason;
  const keepStaffReason = reason === "staff_review";

  return {
    ...(alreadyStarted || keepStaffReason
      ? {}
      : {
          catalogRetentionStartedAt: now,
          catalogExclusionReason: CUSTOMER_UPLOAD_UNPROMOTED_DONATION_RETENTION_REASON,
        }),
  };
}

/** Clear personal-style donation shelf life when the upload is promoted into the catalog. */
export function buildClearUnpromotedDonationRetentionPatch(
  now?: FieldValue,
): Record<string, unknown> {
  const timestamp = now ?? FieldValue.serverTimestamp();
  return {
    catalogRetentionStartedAt: FieldValue.delete(),
    catalogExclusionReason: FieldValue.delete(),
    updatedAt: timestamp,
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
    studioIntakeReleasedAt: timestamp,
    studioIntakeHoldUntilShow: FieldValue.delete(),
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
    // Denied / already-excluded rows still need a Studio visibility release on Add to Show.
    releaseCustomerUploadStudioIntakeInTransaction(transaction, uploadSnap, now);
    return "noop";
  }
  transaction.update(
    uploadSnap.ref,
    buildCustomerUploadStaffReviewTransitionPatch(now),
  );
  return "advanced";
}

/**
 * Marks a print-request upload visible in Studio intake after successful show submit.
 * Idempotent; safe for denied rows that never become Pending.
 */
export function releaseCustomerUploadStudioIntakeInTransaction(
  transaction: Transaction,
  uploadSnap: DocumentSnapshot,
  now?: FieldValue,
): boolean {
  if (!uploadSnap.exists) {
    return false;
  }
  const data = uploadSnap.data() ?? {};
  if (data.studioIntakeHoldUntilShow !== true) {
    return false;
  }
  const timestamp = now ?? FieldValue.serverTimestamp();
  transaction.update(uploadSnap.ref, {
    studioIntakeReleasedAt: timestamp,
    studioIntakeHoldUntilShow: FieldValue.delete(),
    updatedAt: timestamp,
  });
  return true;
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
