/**
 * Future AI enrichment metadata (Phase 7).
 * Do not write this object to Firestore during Phase 2.
 */
export interface AiMetadata {
  generatedTitle?: string;
  generatedDescription?: string;
  generatedTags?: string[];
  generatedCategoryId?: string;
  confidence?: number;
  reviewed: boolean;
}

/**
 * Optional technical metadata populated by the import pipeline (Phase 3).
 * Print-size production fields (`printWidthInches`, `effectiveDpi`, etc.) are on `Design` (Phase 3D).
 */
export interface DesignTechnicalMetadata {
  width?: number;
  height?: number;
  /** Legacy metadata DPI from import validation. Prefer `effectiveDpi` on `Design`. */
  dpi?: number;
}
