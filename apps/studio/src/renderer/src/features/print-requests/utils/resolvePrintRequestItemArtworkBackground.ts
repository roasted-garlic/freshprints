import type { Design } from "../../designs/types/design.types";

/**
 * Resolves the `artworkBackgroundHex` a Print Request item's artwork preview (thumbnail and
 * lightbox) should use. Prefers the catalog design's saved value, then Staff Artwork / upload
 * summary mat. `DesignThumbnailPanel` and `DesignPreviewLightbox` already apply the established
 * `resolveArtworkBackgroundHex` fallback (safe default grey when absent/malformed) when this
 * resolves to `undefined`.
 */
export function resolvePrintRequestItemArtworkBackground(
  design?: Design,
  upload?: { artworkBackgroundHex?: string | null } | null,
): string | undefined {
  return design?.artworkBackgroundHex ?? upload?.artworkBackgroundHex ?? undefined;
}
