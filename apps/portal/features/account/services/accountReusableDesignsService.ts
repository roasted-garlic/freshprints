import { catalogService } from '../../catalog/services/catalogService';
import type { CatalogDesign } from '../../catalog/types/catalog.types';
import {
  customerUploadService,
  type AccountArtworkGalleryItem,
} from '../../customer-uploads/services/customerUploadService';

/**
 * Uploads/donations that were promoted and are still ready in the catalog.
 */
export async function listReusableDesignsFromAccountUploads(
  customerUid: string,
  galleryItems?: AccountArtworkGalleryItem[],
): Promise<CatalogDesign[]> {
  const trimmedUid = customerUid.trim();
  if (!trimmedUid) {
    return [];
  }

  const items = galleryItems ?? (await customerUploadService.listAccountArtworkGallery(trimmedUid));
  const promotedIds = [
    ...new Set(
      items
        .map((item) => item.promotedDesignId)
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
    ),
  ];

  if (promotedIds.length === 0) {
    return [];
  }

  const designs = await catalogService.getReadyDesignsByIds(promotedIds);
  return designs.sort((left, right) => (right.updatedAtMs ?? 0) - (left.updatedAtMs ?? 0));
}
