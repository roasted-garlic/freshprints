import {
  isCatalogTitleSource,
  type CatalogTitleSource,
} from "../../packages/shared/src/types/design/catalogTitleSource.types";
import { isImportPlaceholderTitle } from "./ai/finalCatalogCopy";

function resolveStaffArtworkTitleSource(artwork: Record<string, unknown>): CatalogTitleSource {
  if (isCatalogTitleSource(artwork.catalogTitleSource)) {
    return artwork.catalogTitleSource;
  }

  // Legacy records did not persist whether their short title was generated or explicitly
  // authored. Keep this fallback narrow and reuse the existing import-placeholder rules rather
  // than treating generic Staff Artwork metadata as title authority.
  return isImportPlaceholderTitle(artwork.title, artwork.sourceFileName, { legacyFallback: true })
    ? "import_filename"
    : "staff";
}

export interface StaffArtworkPromotionMetadata {
  title: string;
  catalogTitleSource: CatalogTitleSource;
  importSourceFileName?: string;
}

/**
 * Normalize promotion metadata without mutating a legacy Staff Artwork record. Older valid
 * records omitted catalogTitleSource but retained the filename/title pair.
 */
export function resolveStaffArtworkPromotionMetadata(
  artwork: Record<string, unknown>,
): StaffArtworkPromotionMetadata {
  const title = typeof artwork.title === "string" && artwork.title.trim()
    ? artwork.title.trim()
    : "Staff Artwork";
  const sourceFileName =
    typeof artwork.sourceFileName === "string" && artwork.sourceFileName.trim()
      ? artwork.sourceFileName.trim()
      : undefined;
  return {
    title,
    catalogTitleSource: resolveStaffArtworkTitleSource(artwork),
    ...(sourceFileName ? { importSourceFileName: sourceFileName } : {}),
  };
}
