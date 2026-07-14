export const REJECTED_DESIGN_AUTO_ARCHIVE_AFTER_DAYS = 7;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Clock for reject cool-off: prefer `aiReviewedAt`, fall back to `updatedAt` for legacy docs.
 */
export function resolveRejectedDesignClockMillis(input: {
  aiReviewedAtMillis?: number | null;
  updatedAtMillis?: number | null;
}): number | null {
  if (typeof input.aiReviewedAtMillis === "number" && Number.isFinite(input.aiReviewedAtMillis)) {
    return input.aiReviewedAtMillis;
  }

  if (typeof input.updatedAtMillis === "number" && Number.isFinite(input.updatedAtMillis)) {
    return input.updatedAtMillis;
  }

  return null;
}

export function isRejectedDesignEligibleForAutoArchive(input: {
  status: string;
  aiReviewedAtMillis?: number | null;
  updatedAtMillis?: number | null;
  nowMs: number;
  afterDays?: number;
}): boolean {
  if (input.status !== "rejected") {
    return false;
  }

  const clock = resolveRejectedDesignClockMillis(input);
  if (clock == null) {
    return false;
  }

  const afterDays = input.afterDays ?? REJECTED_DESIGN_AUTO_ARCHIVE_AFTER_DAYS;
  const cutoffMs = input.nowMs - afterDays * MS_PER_DAY;
  return clock <= cutoffMs;
}
