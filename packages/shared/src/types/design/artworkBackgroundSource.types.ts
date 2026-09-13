/**
 * Provenance for how `designs.artworkBackgroundHex` was established.
 * Display mat only — never treat as halftone evidence.
 */
export type ArtworkBackgroundSource =
  | "import_override"
  | "import_halftone_default"
  | "code_auto"
  | "staff_manual";

/**
 * Optional provenance for how `halftoneStaffDecision` was written.
 * Import batch “all halftones” is staff authority at import time (ADR-FP-080).
 */
export type HalftoneDecisionSource = "import_batch" | "ai_review" | "intake" | "customer";

export type ImportHalftoneMode = "normal" | "all_halftones";

export type ImportArtworkBackgroundMode = "auto" | "all_light" | "all_dark";

export const ARTWORK_BACKGROUND_SOURCES: readonly ArtworkBackgroundSource[] = [
  "import_override",
  "import_halftone_default",
  "code_auto",
  "staff_manual",
] as const;

export const HALFTONE_DECISION_SOURCES: readonly HalftoneDecisionSource[] = [
  "import_batch",
  "ai_review",
  "intake",
  "customer",
] as const;

export function isArtworkBackgroundSource(value: unknown): value is ArtworkBackgroundSource {
  return (
    typeof value === "string" &&
    (ARTWORK_BACKGROUND_SOURCES as readonly string[]).includes(value)
  );
}

export function isHalftoneDecisionSource(value: unknown): value is HalftoneDecisionSource {
  return (
    typeof value === "string" &&
    (HALFTONE_DECISION_SOURCES as readonly string[]).includes(value)
  );
}
