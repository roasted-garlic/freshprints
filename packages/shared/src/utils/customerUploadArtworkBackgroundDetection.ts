import { ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK } from "../constants/design/artworkBackground.constants";
import type { ArtworkBackgroundSource } from "../types/design/artworkBackgroundSource.types";

export interface CustomerUploadArtworkBackgroundDetectionFields {
  /** `true` when detector suggests dark; `null` clears a prior hint. */
  suggestDarkArtworkBackground: true | null;
  /**
   * When not preserving staff_manual: dark hex + `code_auto`, or nulls to clear prior code_auto.
   * Callers must omit these two when `preserveStaffManual` is true.
   */
  artworkBackgroundHex: string | null;
  artworkBackgroundSource: ArtworkBackgroundSource | null;
}

/**
 * Firestore-ready artwork-background fields from the shared import dark-mat detector.
 * Display mat only — never implies halftone.
 */
export function buildCustomerUploadArtworkBackgroundDetectionFields(
  suggestDark: boolean,
): CustomerUploadArtworkBackgroundDetectionFields {
  if (suggestDark) {
    return {
      suggestDarkArtworkBackground: true,
      artworkBackgroundHex: ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK,
      artworkBackgroundSource: "code_auto",
    };
  }
  return {
    suggestDarkArtworkBackground: null,
    artworkBackgroundHex: null,
    artworkBackgroundSource: null,
  };
}

/**
 * Merge detector outcome into a ready-write patch.
 * Always refreshes `suggestDarkArtworkBackground`.
 * Skips hex/source when existing provenance is `staff_manual`.
 */
export function applyCustomerUploadArtworkBackgroundDetectionToReadyPatch(
  patch: Record<string, unknown>,
  input: {
    suggestDark: boolean;
    existingArtworkBackgroundSource?: string | null;
  },
): void {
  const fields = buildCustomerUploadArtworkBackgroundDetectionFields(input.suggestDark);
  patch.suggestDarkArtworkBackground = fields.suggestDarkArtworkBackground;
  if (input.existingArtworkBackgroundSource === "staff_manual") {
    return;
  }
  patch.artworkBackgroundHex = fields.artworkBackgroundHex;
  patch.artworkBackgroundSource = fields.artworkBackgroundSource;
}
