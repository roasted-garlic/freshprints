/**
 * Designs that appear on Studio AI Processing (any tab), for selective test-data wipe.
 * Mirrors Studio `designMatchesInboxTab` for processing | needs_review | rejected.
 * Ignores `aiProcessingStage` — wipe regardless of pipeline progress.
 */

export interface AiProcessingDesignWipeFields {
  status?: string | null;
  aiReviewStatus?: string | null;
}

/**
 * True when the design would appear on the AI Processing page
 * (Processing, Needs Review, or Rejected tab).
 */
export function isAiProcessingPageDesign(design: AiProcessingDesignWipeFields): boolean {
  const status = typeof design.status === "string" ? design.status : "";
  const aiReviewStatus =
    typeof design.aiReviewStatus === "string" ? design.aiReviewStatus : "";

  if (status === "rejected") {
    return true;
  }

  if (
    (status === "imported" || status === "processing") &&
    aiReviewStatus === "pending"
  ) {
    return true;
  }

  if (status === "imported" && aiReviewStatus === "needs_review") {
    return true;
  }

  return false;
}

/** Canonical design Storage object paths for a design id (best-effort wipe fallbacks). */
export function buildAiProcessingDesignStoragePaths(designId: string): string[] {
  const id = designId.trim();
  if (!id) {
    return [];
  }

  return [`originals/${id}.png`, `thumbnails/${id}.webp`, `previews/${id}.webp`];
}
