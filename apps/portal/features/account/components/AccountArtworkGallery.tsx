'use client';

import { useEffect, useState } from 'react';

import { CatalogPreviewLightbox } from '../../catalog/components/CatalogPreviewLightbox';
import { customerUploadService } from '../../customer-uploads/services/customerUploadService';
import {
  ACCOUNT_ARTWORK_PREVIEW_LIMIT,
  useAccountArtworkGallery,
  type AccountArtworkGalleryTile,
} from '../hooks/useAccountArtworkGallery';
import { AccountArtworkGalleryModal } from './AccountArtworkGalleryModal';

interface AccountArtworkGalleryProps {
  customerUid: string | undefined;
  onArtworkCountsChange?: (counts: { donatedCount: number; uploadCount: number }) => void;
  /** When true, render without the outer panel chrome (for nesting under Overview). */
  embedded?: boolean;
}

export function AccountArtworkGallery({
  customerUid,
  embedded = false,
  onArtworkCountsChange,
}: AccountArtworkGalleryProps) {
  const { donatedCount, errorMessage, isLoading, items, previewItems, uploadCount } =
    useAccountArtworkGallery(customerUid);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lightbox, setLightbox] = useState<{ alt: string; url: string } | null>(null);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    onArtworkCountsChange?.({ donatedCount, uploadCount });
  }, [donatedCount, isLoading, onArtworkCountsChange, uploadCount]);

  const hasMore = items.length > ACCOUNT_ARTWORK_PREVIEW_LIMIT;

  async function openLightbox(item: AccountArtworkGalleryTile) {
    const url =
      (await customerUploadService.getDownloadUrl(item.previewStoragePath)) ?? item.imageUrl;
    if (!url) {
      return;
    }
    setLightbox({ alt: item.title, url });
  }

  const content = (
    <>
      <div className="portal-account-gallery-header">
        <div>
          {embedded ? (
            <h3 className="portal-account-gallery-subtitle">Your designs</h3>
          ) : (
            <h2 className="portal-account-section-title">Your designs</h2>
          )}
          <p className="portal-muted portal-account-gallery-intro">
            Recent uploads and donations.
          </p>
        </div>
        {hasMore ? (
          <button
            className="portal-button portal-button-secondary"
            onClick={() => setIsModalOpen(true)}
            type="button"
          >
            View more
          </button>
        ) : null}
      </div>

      {isLoading ? (
        <p className="portal-muted">Loading your designs…</p>
      ) : errorMessage ? (
        <p className="portal-muted portal-account-gallery-empty">{errorMessage}</p>
      ) : previewItems.length === 0 ? (
        <p className="portal-muted portal-account-gallery-empty">
          Designs you upload for printing or donate to the catalog will show up here. Catalog designs
          you add from the library are not listed in this gallery.
        </p>
      ) : (
        <div className="portal-account-gallery-grid">
          {previewItems.map((item) => (
            <button
              key={item.id}
              className="portal-account-gallery-tile"
              onClick={() => void openLightbox(item)}
              type="button"
            >
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- signed Storage URLs
                <img alt="" className="portal-account-gallery-tile-image" decoding="async" src={item.imageUrl} />
              ) : null}
              <span className={`portal-account-gallery-tile-badge is-${item.kind}`}>
                {item.kind === 'donation' ? 'Donated' : 'Upload'}
              </span>
            </button>
          ))}
        </div>
      )}

      <AccountArtworkGalleryModal
        isOpen={isModalOpen}
        items={items}
        onClose={() => setIsModalOpen(false)}
        onSelect={(item) => {
          void openLightbox(item);
        }}
      />

      <CatalogPreviewLightbox
        alt={lightbox?.alt ?? 'Design preview'}
        isOpen={lightbox !== null}
        onClose={() => setLightbox(null)}
        previewUrl={lightbox?.url ?? null}
      />
    </>
  );

  if (embedded) {
    return <div className="portal-account-gallery-embedded">{content}</div>;
  }

  return (
    <section className="portal-panel portal-account-panel portal-account-gallery-panel">{content}</section>
  );
}
