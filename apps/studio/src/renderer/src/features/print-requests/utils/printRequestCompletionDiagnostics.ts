import { mapFirestoreTimestamp } from "../../firebase/utils/firestoreTimestamp";

const KNOWN_FIELDS = new Set([
  "id", "name", "customerId", "guestCustomerId", "isInternal", "requestOrigin", "status",
  "itemCount", "queueTab", "requestSequenceNumber", "customerUsernameSnapshot",
  "customerDisplayNameSnapshot", "internalBaseName", "nameFormatVersion", "notes",
  "showQueueBiddingAcknowledgment", "createdBy", "updatedBy", "createdAt", "updatedAt",
]);

const VALID_QUEUE_TABS = new Set(["working", "queued", "printing", "printed"]);

export type PrintRequestAssignmentInvariantFailure =
  | "both_customer_and_guest_id_present"
  | "neither_customer_nor_guest_id_present"
  | "request_origin_mismatch";

function hasNonEmptyString(data: Record<string, unknown>, field: string): boolean {
  return typeof data[field] === "string" && (data[field] as string).length > 0;
}

/**
 * Mirrors firestore.rules' `isValidPrintRequestAssignment`/`isValidPrintRequestOriginAssignment`
 * exactly (Plan Section 29.3) — a READ-ONLY diagnostic evaluation of the same cross-field
 * invariant Rules enforce against the full post-merge document on every `printRequests` update.
 * This does not change any write, permission, or behavior; it only lets the completion-retry
 * manifest report WHICH named condition fails, if any, instead of reporting "compatible" for a
 * document that Rules will still deny. Returns `null` when the assignment is valid.
 */
export function diagnosePrintRequestAssignmentInvariant(
  data: Record<string, unknown>,
): PrintRequestAssignmentInvariantFailure | null {
  const isInternal = data.isInternal === true;
  const hasCustomerId = hasNonEmptyString(data, "customerId");
  const hasGuestCustomerId = hasNonEmptyString(data, "guestCustomerId");

  if (isInternal) {
    // isValidPrintRequestAssignment: internal requests must have NEITHER id field.
    if (hasCustomerId || hasGuestCustomerId) {
      return "both_customer_and_guest_id_present";
    }
  } else {
    if (hasCustomerId && hasGuestCustomerId) {
      return "both_customer_and_guest_id_present";
    }
    if (!hasCustomerId && !hasGuestCustomerId) {
      return "neither_customer_nor_guest_id_present";
    }
  }

  const requestOrigin = data.requestOrigin;
  if (requestOrigin === undefined) {
    return null;
  }
  if (requestOrigin === "studio_internal") {
    return isInternal && !hasCustomerId && !hasGuestCustomerId ? null : "request_origin_mismatch";
  }
  if (requestOrigin === "studio_customer" || requestOrigin === "portal_customer") {
    return !isInternal && (hasCustomerId !== hasGuestCustomerId) ? null : "request_origin_mismatch";
  }
  // An unrecognized requestOrigin value is itself a mismatch against the Rules' own enum check,
  // but that is already covered by the existing field-presence/type diagnostics above — do not
  // double-report it here.
  return null;
}

export function diagnosePrintRequestForCompletion(data: Record<string, unknown>) {
  const checks: Array<[string, boolean]> = [
    ["name", typeof data.name === "string"],
    ["status", typeof data.status === "string"],
    ["itemCount", typeof data.itemCount === "number"],
    ["createdBy", typeof data.createdBy === "string"],
    ["updatedBy", typeof data.updatedBy === "string"],
    ["createdAt", mapFirestoreTimestamp(data.createdAt) !== undefined],
    ["updatedAt", mapFirestoreTimestamp(data.updatedAt) !== undefined],
  ];
  const missingFields = checks.filter(([, valid]) => !valid).map(([field]) => field);
  const acknowledgment = data.showQueueBiddingAcknowledgment;
  const acknowledgmentRecord =
    acknowledgment && typeof acknowledgment === "object"
      ? acknowledgment as Record<string, unknown>
      : null;
  const queueTabStatus =
    data.queueTab === undefined
      ? "absent"
      : typeof data.queueTab === "string" && VALID_QUEUE_TABS.has(data.queueTab)
        ? "valid"
        : "invalid";
  const biddingAcknowledgmentStatus =
    acknowledgment === undefined
      ? "absent"
      : acknowledgmentRecord
        && acknowledgmentRecord.accepted === true
        && mapFirestoreTimestamp(acknowledgmentRecord.acceptedAt) !== undefined
        && hasNonEmptyString(acknowledgmentRecord, "acceptedByUid")
        && hasNonEmptyString(acknowledgmentRecord, "version")
        && hasNonEmptyString(acknowledgmentRecord, "upcomingShowId")
        && Object.keys(acknowledgmentRecord).every((field) =>
          ["accepted", "acceptedAt", "acceptedByUid", "version", "upcomingShowId"].includes(field))
          ? "valid"
          : "invalid";
  return {
    parserStatus: missingFields.length === 0 ? "compatible" as const : "incompatible" as const,
    missingFields,
    legacyExtraFields: Object.keys(data).filter((field) => !KNOWN_FIELDS.has(field)).sort(),
    assignmentInvariantFailure: diagnosePrintRequestAssignmentInvariant(data),
    queueTabStatus,
    biddingAcknowledgmentStatus,
  };
}
