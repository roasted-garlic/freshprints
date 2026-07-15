'use client';

import { useEffect, useState } from 'react';

import { CatalogDesignDetailsModal } from '../../catalog/components/CatalogDesignDetailsModal';
import { CatalogPreviewLightbox } from '../../catalog/components/CatalogPreviewLightbox';
import type { CatalogDesign } from '../../catalog/types/catalog.types';
import { customerUploadService } from '../../customer-uploads/services/customerUploadService';
import { useAddDesignToRequestFlow } from '../../print-requests/hooks/useAddDesignToRequestFlow';
import { usePortalPrintRequests } from '../../print-requests/context/PortalPrintRequestContext';
import { PortalConfirmModal } from '../../shared/components/PortalConfirmModal';
import { PortalPickContinuableRequestModal } from '../../shared/components/PortalPickContinuableRequestModal';
import {
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
  const {
    donatedCount,
    errorMessage,
    isLoading,
    items,
    previewItems,
    reusableDesigns,
    reusableErrorMessage,
    isReusableLoading,
    uploadCount,
  } = useAccountArtworkGallery(customerUid);

  const {
    continuableRequests,
    createPrintRequest,
    refreshRequests,
    reloadWorkingItems,
  } = usePortalPrintRequests();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lightbox, setLightbox] = useState<{ alt: string; url: string } | null>(null);
  const [selectedDesign, setSelectedDesign] = useState<CatalogDesign | null>(null);

  const addDesignFlow = useAddDesignToRequestFlow({
    continuableRequests,
    createPrintRequest,
    onBeforeNavigate: () => setSelectedDesign(null),
    refreshRequests,
    reloadWorkingItems,
  });

  useEffect(() => {
    if (isLoading) {
      return;
    }
    onArtworkCountsChange?.({ donatedCount, uploadCount });
  }, [donatedCount, isLoading, onArtworkCountsChange, uploadCount]);

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
            Designs you have submitted for printing or donated to the catalog.
          </p>
        </div>
        <button
          className="portal-button portal-button-secondary"
          onClick={() => setIsModalOpen(true)}
          type="button"
        >
          View more
        </button>
      </div>

      {isLoading ? (
        <p className="portal-muted">Loading your designs…</p>
      ) : errorMessage ? (
        <p className="portal-muted portal-account-gallery-empty">{errorMessage}</p>
      ) : previewItems.length === 0 ? (
        <p className="portal-muted portal-account-gallery-empty">
          Submitted uploads and donations show up here once processing finishes. In-progress drafts
          and catalog picks from the library are not listed.
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
                <img
                  alt=""
                  className="portal-account-gallery-tile-image"
                  decoding="async"
                  src={item.imageUrl}
                />
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
        isReusableLoading={isReusableLoading}
        items={items}
        onClose={() => setIsModalOpen(false)}
        onSelectPast={(item) => {
          void openLightbox(item);
        }}
        onSelectReusable={(design) => {
          setIsModalOpen(false);
          setSelectedDesign(design);
        }}
        reusableDesigns={reusableDesigns}
        reusableErrorMessage={reusableErrorMessage}
      />

      <CatalogPreviewLightbox
        alt={lightbox?.alt ?? 'Design preview'}
        isOpen={lightbox !== null}
        onClose={() => setLightbox(null)}
        previewUrl={lightbox?.url ?? null}
      />

      <CatalogDesignDetailsModal
        design={selectedDesign}
        isAdding={selectedDesign !== null && addDesignFlow.addingDesignId === selectedDesign.id}
        isOpen={selectedDesign !== null}
        onAddToRequest={addDesignFlow.addDesign}
        onClose={() => setSelectedDesign(null)}
      />

      <PortalConfirmModal
        confirmLabel={addDesignFlow.isAdding ? 'Adding…' : 'Add to request'}
        isConfirmLoading={addDesignFlow.isAdding}
        isOpen={addDesignFlow.isConfirmOpen}
        onCancel={addDesignFlow.closeConfirm}
        onConfirm={addDesignFlow.confirmAddDesign}
        title="Add to request?"
      >
        <p className="portal-muted portal-confirm-modal-message">{addDesignFlow.confirmMessage}</p>
      </PortalConfirmModal>

      <PortalPickContinuableRequestModal
        continuableRequests={continuableRequests}
        designTitle={addDesignFlow.pendingDesign?.title}
        isAdding={addDesignFlow.isAdding}
        isOpen={addDesignFlow.isPickerOpen}
        onClose={addDesignFlow.closePicker}
        onSelectRequest={addDesignFlow.confirmPickRequest}
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
