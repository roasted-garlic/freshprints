import type { Design } from "../types/design.types";

/** UI preflight only; the owner-only callable remains the authoritative revalidation boundary. */
export function isDesignEligibleForReadyAiReprocess(design: Design): boolean {
  return (
    design.status === "ready" &&
    design.aiReviewStatus === "approved" &&
    !design.assetsPurgedAt &&
    Boolean(design.thumbnailPath.trim()) &&
    Boolean((design.previewPath ?? design.thumbnailPath).trim())
  );
}
