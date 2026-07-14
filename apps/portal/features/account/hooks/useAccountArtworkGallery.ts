'use client';

import { useEffect, useState } from 'react';

import {
  customerUploadService,
  type AccountArtworkGalleryItem,
} from '../../customer-uploads/services/customerUploadService';

export interface AccountArtworkGalleryTile extends AccountArtworkGalleryItem {
  imageUrl: string | null;
}

const PREVIEW_LIMIT = 5;

export function useAccountArtworkGallery(customerUid: string | undefined): {
  donatedCount: number;
  errorMessage: string | null;
  isLoading: boolean;
  items: AccountArtworkGalleryTile[];
  previewItems: AccountArtworkGalleryTile[];
  uploadCount: number;
} {
  const [items, setItems] = useState<AccountArtworkGalleryTile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!customerUid) {
      setItems([]);
      setErrorMessage(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setErrorMessage(null);

    void (async () => {
      try {
        const gallery = await customerUploadService.listAccountArtworkGallery(customerUid);
        const withUrls = await Promise.all(
          gallery.map(async (item) => {
            const imageUrl = await customerUploadService.resolveAccountArtworkImageUrl(item);
            return { ...item, imageUrl };
          }),
        );

        if (!cancelled) {
          // Keep metadata even if a signed URL fails so counts stay accurate.
          setItems(withUrls);
        }
      } catch (error) {
        if (!cancelled) {
          setItems([]);
          setErrorMessage(
            error instanceof Error ? error.message : 'Unable to load your designs right now.',
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [customerUid]);

  const visibleItems = items.filter((item) => Boolean(item.imageUrl));

  return {
    donatedCount: items.filter((item) => item.kind === 'donation').length,
    errorMessage,
    isLoading,
    items: visibleItems,
    previewItems: visibleItems.slice(0, PREVIEW_LIMIT),
    uploadCount: items.filter((item) => item.kind === 'upload').length,
  };
}

export { PREVIEW_LIMIT as ACCOUNT_ARTWORK_PREVIEW_LIMIT };
