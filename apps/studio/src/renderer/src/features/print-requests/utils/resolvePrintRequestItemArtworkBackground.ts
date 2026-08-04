import type { Design } from "../../designs/types/design.types";

/**
 * Resolves the `artworkBackgroundHex` a Print Request item's artwork preview (thumbnail and
 * lightbox) should use. Simply forwards the catalog design's own saved value — `DesignThumbnailPanel`
 * and `DesignPreviewLightbox` already apply the established `resolveArtworkBackgroundHex` fallback
 * (safe default grey when absent/malformed) when this resolves to `undefined`, matching the pattern
 * already used by `DesignSelectionCard`. Customer-upload items (no `design`) have no background
 * concept and correctly resolve to `undefined`, leaving the existing default background unchanged.
 */
export function resolvePrintRequestItemArtworkBackground(design?: Design): string | undefined {
  return design?.artworkBackgroundHex;
}
