/** Import and edit provenance for staff print-size intent fields. */
export type PrintSizeSource = "import_normalized" | "staff_edited" | "metadata_inferred";

/** Pixel-based acceptance outcome at import-normalized effective DPI. */
export type PrintSizeAcceptanceLevel =
  | "accept"
  | "warn"
  | "small_format"
  | "terrible"
  | "reject";

/** Staff-facing effective DPI quality tier for catalog pills and edit display. */
export type EffectiveDpiQualityLevel = "optimal" | "good" | "bad" | "terrible";
