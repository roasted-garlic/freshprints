import { FieldValue } from "firebase-admin/firestore";

/**
 * Shared confirmation fields when marking uploads ready for Studio catalog intake.
 * Attach sets printRequestId; donate leaves it null.
 */
export function buildCatalogIntakeConfirmationPatch(input: {
  catalogUseAcknowledged: boolean;
  termsVersion: string;
  printRequestId: string | null;
  now?: FieldValue;
}): Record<string, unknown> {
  const now = input.now ?? FieldValue.serverTimestamp();
  return {
    ownershipConfirmed: true,
    catalogUseAcknowledged: input.catalogUseAcknowledged,
    termsVersion: input.termsVersion,
    confirmedAt: now,
    printRequestId: input.printRequestId,
    catalogReviewStatus: "pending_staff_review",
    updatedAt: now,
  };
}
