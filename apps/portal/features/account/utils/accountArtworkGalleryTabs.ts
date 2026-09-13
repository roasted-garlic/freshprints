import type { AccountArtworkGalleryItem } from '../../customer-uploads/services/customerUploadService';

/** Past-upload tabs inside Your designs (excludes Design Library / promoted designs). */
export type AccountArtworkGalleryPastTab = 'personal' | 'uploaded' | 'donated';

export type AccountArtworkGalleryTab = AccountArtworkGalleryPastTab | 'library';

type GalleryTabItem = Pick<
  AccountArtworkGalleryItem,
  'kind' | 'promotedDesignId' | 'catalogUseAcknowledged'
>;

/** Classify a gallery upload into a past tab, or null once it is in the Design Library. */
export function getAccountArtworkGalleryPastTab(
  item: GalleryTabItem,
): AccountArtworkGalleryPastTab | null {
  if (item.promotedDesignId) {
    return null;
  }
  if (item.kind === 'donation') {
    return 'donated';
  }
  if (item.catalogUseAcknowledged === false) {
    return 'personal';
  }
  return 'uploaded';
}

/** Don’t-allow / no catalog permission — personal reuse only. */
export function isPersonalAccountArtworkTile(item: GalleryTabItem): boolean {
  return getAccountArtworkGalleryPastTab(item) === 'personal';
}

/** Print-request uploads waiting for Design Library promotion. */
export function isUploadedAccountArtworkTile(item: GalleryTabItem): boolean {
  return getAccountArtworkGalleryPastTab(item) === 'uploaded';
}

/** Catalog donation uploads not yet promoted. */
export function isDonatedAccountArtworkTile(item: GalleryTabItem): boolean {
  return getAccountArtworkGalleryPastTab(item) === 'donated';
}

/** Any non-promoted past upload shown across Personal / Uploaded / Donated. */
export function isPastAccountArtworkTile(item: GalleryTabItem): boolean {
  return getAccountArtworkGalleryPastTab(item) !== null;
}

/** Past-upload tabs where the customer may hard-delete from Your designs. */
export function canCustomerDeleteAccountArtworkTile(item: GalleryTabItem): boolean {
  return getAccountArtworkGalleryPastTab(item) === 'personal';
}

export function filterAccountArtworkByPastTab(
  items: readonly GalleryTabItem[],
  tab: AccountArtworkGalleryPastTab,
): GalleryTabItem[] {
  return items.filter((item) => getAccountArtworkGalleryPastTab(item) === tab);
}
