'use client';

import { useEffect, useState } from 'react';

import type { CatalogDesign } from '../../catalog/types/catalog.types';
import {
  customerUploadService,
  type AccountArtworkGalleryItem,
} from '../../customer-uploads/services/customerUploadService';
import { listReusableDesignsFromAccountUploads } from '../services/accountReusableDesignsService';

export interface AccountArtworkGalleryTile extends AccountArtworkGalleryItem {
  imageUrl: string | null;
}

/** Two rows × seven columns on the account overview preview. */
const PREVIEW_LIMIT = 14;

export function useAccountArtworkGallery(customerUid: string | undefined): {
  donatedCount: number;
  errorMessage: string | null;
  isLoading: boolean;
  items: AccountArtworkGalleryTile[];
  previewItems: AccountArtworkGalleryTile[];
  reusableDesigns: CatalogDesign[];
  reusableErrorMessage: string | null;
  isReusableLoading: boolean;
  uploadCount: number;
} {
  const [items, setItems] = useState<AccountArtworkGalleryTile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reusableDesigns, setReusableDesigns] = useState<CatalogDesign[]>([]);
  const [isReusableLoading, setIsReusableLoading] = useState(false);
  const [reusableErrorMessage, setReusableErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!customerUid) {
      setItems([]);
      setReusableDesigns([]);
      setErrorMessage(null);
      setReusableErrorMessage(null);
      setIsLoading(false);
      setIsReusableLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setIsReusableLoading(true);
    setErrorMessage(null);
    setReusableErrorMessage(null);

    void (async () => {
      try {
        const gallery = await customerUploadService.listAccountArtworkGallery(customerUid);
        const withUrls = await Promise.all(
          gallery.map(async (item) => {
            const imageUrl = await customerUploadService.resolveAccountArtworkImageUrl(item);
            return { ...item, imageUrl };
          }),
        );

        if (cancelled) {
          return;
        }

        setItems(withUrls);

        try {
          const reusable = await listReusableDesignsFromAccountUploads(customerUid, gallery);
          if (!cancelled) {
            setReusableDesigns(reusable);
          }
        } catch (reusableError) {
          if (!cancelled) {
            setReusableDesigns([]);
            setReusableErrorMessage(
              reusableError instanceof Error
                ? reusableError.message
                : 'Unable to load reusable designs.',
            );
          }
        } finally {
          if (!cancelled) {
            setIsReusableLoading(false);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setItems([]);
          setReusableDesigns([]);
          setErrorMessage(
            error instanceof Error ? error.message : 'Unable to load your designs right now.',
          );
          setIsReusableLoading(false);
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
    reusableDesigns,
    reusableErrorMessage,
    isReusableLoading,
    uploadCount: items.filter((item) => item.kind === 'upload').length,
  };
}

export { PREVIEW_LIMIT as ACCOUNT_ARTWORK_PREVIEW_LIMIT };
