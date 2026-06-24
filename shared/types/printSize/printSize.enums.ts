/** Import and edit provenance for staff print-size intent fields. */
export type PrintSizeSource = "import_normalized" | "staff_edited" | "metadata_inferred";

/** Pixel-based acceptance outcome at the target production DPI. */
export type PrintSizeAcceptanceLevel = "accept" | "warn" | "small_format" | "reject";

/** Staff-facing effective DPI quality tier for edit and details display. */
export type EffectiveDpiQualityLevel = "preferred" | "standard" | "small_format" | "low_resolution";
