import { AI_ENRICHMENT_STALE_STAGE_MS } from "@fresh-prints/shared/constants/aiEnrichment.constants";

import type { Design } from "../../designs/types/design.types";
import { resolveAiProcessingOutputStatus } from "./aiProcessingOutput";

export const STALE_PROCESSING_STATUS_COPY = "Processing appears stuck";

export const STALE_PROCESSING_ALREADY_PROCESSING_MESSAGE =
  "This design is still processing. Try again shortly.";

/** Resolve persisted `updatedAt` to epoch ms; returns null when missing or invalid. */
export function resolveDesignUpdatedAtMs(design: Design): number | null {
  const updatedAt = design.updatedAt;

  if (!updatedAt) {
    return null;
  }

  if (typeof updatedAt.toMillis === "function") {
    const ms = updatedAt.toMillis();
    return Number.isFinite(ms) ? ms : null;
  }

  if (typeof updatedAt.toDate === "function") {
    const ms = updatedAt.toDate().getTime();
    return Number.isFinite(ms) ? ms : null;
  }

  return null;
}

/**
 * True when a design is in an active/waiting AI pipeline stage and persisted `updatedAt` is
 * older than the authoritative server stale window. Matches `isStaleAiProcessing` in
 * enqueueAiEnrichment (strict `>` boundary).
 */
export function isAiProcessingStaleForRecovery(
  design: Design,
  nowMs: number = Date.now(),
): boolean {
  if (resolveAiProcessingOutputStatus(design) !== "waiting") {
    return false;
  }

  const updatedAtMs = resolveDesignUpdatedAtMs(design);

  if (updatedAtMs === null) {
    return false;
  }

  return nowMs - updatedAtMs > AI_ENRICHMENT_STALE_STAGE_MS;
}
