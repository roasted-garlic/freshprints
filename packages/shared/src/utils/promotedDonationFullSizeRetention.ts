export const PROMOTED_DONATION_FULL_SIZE_COOL_OFF_DAYS = 14;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type PromotedDonationFullSizeRetentionReason =
  | "not_donation"
  | "not_promoted"
  | "already_purged"
  | "cool_off_not_elapsed"
  | "eligible";

export interface PromotedDonationFullSizeRetentionInput {
  purpose?: string | null;
  catalogReviewStatus?: string | null;
  promotedDesignId?: string | null;
  fullSizePurgedAtMillis?: number | null;
  promotedAtMillis?: number | null;
  updatedAtMillis?: number | null;
  nowMs: number;
  coolOffDays?: number;
}

export interface PromotedDonationFullSizeRetentionResult {
  eligible: boolean;
  reason: PromotedDonationFullSizeRetentionReason;
}

function resolveCoolOffClockMillis(
  input: PromotedDonationFullSizeRetentionInput,
): number | null {
  if (typeof input.promotedAtMillis === "number" && Number.isFinite(input.promotedAtMillis)) {
    return input.promotedAtMillis;
  }
  if (typeof input.updatedAtMillis === "number" && Number.isFinite(input.updatedAtMillis)) {
    return input.updatedAtMillis;
  }
  return null;
}

/**
 * ADR-FP-086 §4 — purge donation upload full-size after promote cool-off.
 * Catalog full-size already lives on the design document Storage paths.
 */
export function evaluatePromotedDonationFullSizeRetention(
  input: PromotedDonationFullSizeRetentionInput,
): PromotedDonationFullSizeRetentionResult {
  const purpose = input.purpose?.trim() || "print_request";
  if (purpose !== "catalog_donation") {
    return { eligible: false, reason: "not_donation" };
  }

  const promotedDesignId = input.promotedDesignId?.trim() ?? "";
  if (!promotedDesignId || input.catalogReviewStatus !== "sent_to_ai_review") {
    return { eligible: false, reason: "not_promoted" };
  }

  if (input.fullSizePurgedAtMillis != null) {
    return { eligible: false, reason: "already_purged" };
  }

  const clock = resolveCoolOffClockMillis(input);
  if (clock == null) {
    return { eligible: false, reason: "cool_off_not_elapsed" };
  }

  const coolOffDays = input.coolOffDays ?? PROMOTED_DONATION_FULL_SIZE_COOL_OFF_DAYS;
  const cutoffMs = input.nowMs - coolOffDays * MS_PER_DAY;
  if (clock > cutoffMs) {
    return { eligible: false, reason: "cool_off_not_elapsed" };
  }

  return { eligible: true, reason: "eligible" };
}
