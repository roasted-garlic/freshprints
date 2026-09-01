import type { PortalShowCatalogDesignCard } from '@fresh-prints/shared/types/portal/listPortalShowCatalogDesigns.types';

import type { CatalogDesign } from '../../catalog/types/catalog.types';

export function mapPortalShowCatalogDesignCardToCatalogDesign(
  card: PortalShowCatalogDesignCard,
): CatalogDesign | null {
  if (
    typeof card.width !== 'number' ||
    !Number.isFinite(card.width) ||
    card.width <= 0 ||
    typeof card.height !== 'number' ||
    !Number.isFinite(card.height) ||
    card.height <= 0
  ) {
    return null;
  }

  const thumbnailPath = typeof card.thumbnailPath === 'string' ? card.thumbnailPath.trim() : '';
  if (!thumbnailPath) {
    return null;
  }

  return {
    id: card.id,
    title: card.title,
    categoryId: card.categoryId,
    tags: card.tags,
    thumbnailPath,
    previewPath: card.previewPath,
    artworkBackgroundHex: card.artworkBackgroundHex,
    width: card.width,
    height: card.height,
    updatedAtMs: card.updatedAtMs,
    requestCount: card.requestCount ?? 0,
    favoriteCount: card.favoriteCount ?? 0,
    isExplicitContent: card.isExplicitContent === true,
  };
}
