'use client';

import { useEffect, useState } from 'react';

import { CatalogDesignDetailsModal } from '../../catalog/components/CatalogDesignDetailsModal';
import {
  CatalogPreviewLightbox,
  type CatalogPreviewLightboxNavItem,
} from '../../catalog/components/CatalogPreviewLightbox';
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
import { useAddCustomerUploadToRequestFlow } from '../hooks/useAddCustomerUploadToRequestFlow';
import {
  canCustomerDeleteAccountArtworkTile,
  getAccountArtworkGalleryPastTab,
} from '../utils/accountArtworkGalleryTabs';
import { AccountArtworkDeletionDialog } from './AccountArtworkDeletionDialog';
import { AccountArtworkGalleryModal } from './AccountArtworkGalleryModal';

interface AccountArtworkGalleryProps {
  customerUid: string | undefined;
  onArtworkCountsChange?: (counts: { donatedCount: number; uploadCount: number }) => void;
  /** When true, render without the outer panel chrome (for nesting under Overview). */
  embedded?: boolean;
}

interface AccountArtworkLightboxState {
  activeItemId: string;
  items: CatalogPreviewLightboxNavItem[];
}

async function resolveGalleryLightboxItems(
  collection: readonly AccountArtworkGalleryTile[],
): Promise<Array<CatalogPreviewLightboxNavItem & { previewUrl: string }>> {
  const resolved: Array<CatalogPreviewLightboxNavItem & { previewUrl: string } | null> =
    await Promise.all(
      collection.map(async (item) => {
        const previewUrl =
          (await customerUploadService.getDownloadUrl(item.previewStoragePath)) ?? item.imageUrl;
        if (!previewUrl) {
          return null;
        }
        return {
          id: item.id,
          alt: item.title,
          previewUrl,
        };
      }),
    );
  return resolved.filter(
    (entry): entry is CatalogPreviewLightboxNavItem & { previewUrl: string } => entry !== null,
  );
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
    reload,
    reusableDesigns,
    reusableErrorMessage,
    isReusableLoading,
    uploadCount,
  } = useAccountArtworkGallery(customerUid);

  const {
    continuableRequests,
    createPrintRequest,
    currentRequestAggregates,
    refreshRequests,
    reloadWorkingItems,
  } = usePortalPrintRequests();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lightbox, setLightbox] = useState<AccountArtworkLightboxState | null>(null);
  const [selectedDesign, setSelectedDesign] = useState<CatalogDesign | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AccountArtworkGalleryTile | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const addDesignFlow = useAddDesignToRequestFlow({
    continuableRequests,
    createPrintRequest,
    onBeforeNavigate: () => setSelectedDesign(null),
    refreshRequests,
    reloadWorkingItems,
  });

  const addUploadFlow = useAddCustomerUploadToRequestFlow();

  useEffect(() => {
    if (isLoading) {
      return;
    }
    onArtworkCountsChange?.({ donatedCount, uploadCount });
  }, [donatedCount, isLoading, onArtworkCountsChange, uploadCount]);

  async function openLightbox(
    item: AccountArtworkGalleryTile,
    collection: readonly AccountArtworkGalleryTile[],
  ) {
    const navItems = await resolveGalleryLightboxItems(collection);
    if (navItems.length === 0 || !navItems.some((entry) => entry.id === item.id)) {
      return;
    }
    setLightbox({ activeItemId: item.id, items: navItems });
  }

  function handleDeleteRequest(item: AccountArtworkGalleryTile) {
    if (!canCustomerDeleteAccountArtworkTile(item)) {
      return;
    }
    setStatusMessage(null);
    setPendingDelete(item);
  }

  const activeLightboxItem =
    lightbox?.items.find((entry) => entry.id === lightbox.activeItemId) ?? lightbox?.items[0];

  const content = (
    <>
      <div className="portal-account-gallery-header">
        <div className="portal-account-gallery-header-copy">
          {embedded ? (
            <h3 className="portal-account-gallery-subtitle">Your designs</h3>
          ) : (
            <h2 className="portal-account-section-title">Your designs</h2>
          )}
          <p className="portal-muted portal-account-gallery-intro">
            Browse personal, uploaded, donated, and library designs.
          </p>
        </div>
        <button
          className="portal-button portal-button-secondary portal-account-gallery-view-more"
          onClick={() => setIsModalOpen(true)}
          type="button"
        >
          View more
        </button>
      </div>

      {statusMessage ? (
        <p className="portal-muted portal-account-gallery-status" role="status">
          {statusMessage}
        </p>
      ) : null}

      {addUploadFlow.errorMessage ? (
        <p className="portal-muted portal-account-gallery-status" role="alert">
          {addUploadFlow.errorMessage}
        </p>
      ) : null}

      {isLoading ? (
        <p className="portal-muted">Loading your designs…</p>
      ) : errorMessage ? (
        <p className="portal-muted portal-account-gallery-empty">{errorMessage}</p>
      ) : previewItems.length === 0 ? (
        <p className="portal-muted portal-account-gallery-empty">
          Your designs show here after processing. Open View more for all tabs.
        </p>
      ) : (
        <div className="portal-account-gallery-grid">
          {previewItems.map((item) => {
            const tab = getAccountArtworkGalleryPastTab(item);
            const badgeClass =
              tab === 'personal' ? ' is-personal' : tab === 'donated' ? ' is-donation' : ' is-upload';
            const badgeLabel =
              tab === 'personal' ? 'Personal' : tab === 'donated' ? 'Donated' : 'Upload';
            return (
              <div className="portal-account-gallery-tile-wrap" key={item.id}>
                <button
                  className="portal-account-gallery-tile"
                  onClick={() => void openLightbox(item, previewItems)}
                  type="button"
                >
                  {item.imageUrl ? (
                    <img
                      alt=""
                      className="portal-account-gallery-tile-image"
                      decoding="async"
                      src={item.imageUrl}
                    />
                  ) : null}
                  <span className={`portal-account-gallery-tile-badge${badgeClass}`}>
                    {badgeLabel}
                  </span>
                </button>
                <div className="portal-account-gallery-tile-actions">
                  <button
                    className="portal-account-gallery-tile-add"
                    onClick={() => addUploadFlow.startAdd(item)}
                    type="button"
                  >
                    Add to request
                  </button>
                  {canCustomerDeleteAccountArtworkTile(item) ? (
                    <button
                      className="portal-account-gallery-tile-delete"
                      onClick={() => handleDeleteRequest(item)}
                      type="button"
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AccountArtworkGalleryModal
        isOpen={isModalOpen}
        isReusableLoading={isReusableLoading}
        items={items}
        onAddPast={addUploadFlow.startAdd}
        onClose={() => setIsModalOpen(false)}
        onDeletePast={handleDeleteRequest}
        onSelectPast={(item, filteredPastItems) => {
          void openLightbox(item, filteredPastItems);
        }}
        onSelectReusable={(design) => {
          setSelectedDesign(design);
        }}
        reusableDesigns={reusableDesigns}
        reusableErrorMessage={reusableErrorMessage}
        suppressEscapeClose={
          selectedDesign !== null || addUploadFlow.isConfirmOpen || addUploadFlow.isPickerOpen
        }
      />

      <AccountArtworkDeletionDialog
        isOpen={pendingDelete !== null}
        item={pendingDelete}
        onCancel={() => setPendingDelete(null)}
        onCompleted={({ kind, message }) => {
          setPendingDelete(null);
          setStatusMessage(message);
          customerUploadService.invalidateDailyQuota();
          if (kind === 'donation') {
            void customerUploadService.getDailyQuota('catalog_donation').catch(() => undefined);
          }
          reload();
        }}
      />

      <CatalogPreviewLightbox
        activeItemId={lightbox?.activeItemId ?? null}
        alt={activeLightboxItem?.alt ?? 'Design preview'}
        isOpen={lightbox !== null}
        navigationItems={lightbox && lightbox.items.length > 1 ? lightbox.items : undefined}
        onActiveItemChange={(itemId) => {
          setLightbox((current) => (current ? { ...current, activeItemId: itemId } : current));
        }}
        onClose={() => setLightbox(null)}
        previewUrl={activeLightboxItem?.previewUrl ?? null}
      />

      <CatalogDesignDetailsModal
        canAddPrints={addDesignFlow.canAddPrints}
        currentRequestQuantity={
          selectedDesign === null
            ? 0
            : (currentRequestAggregates.primaryQuantityByDesignId[selectedDesign.id] ??
              currentRequestAggregates.quantityByDesignId[selectedDesign.id] ??
              0)
        }
        design={selectedDesign}
        exhaustedHelperText={addDesignFlow.exhaustedHelperText}
        exhaustedStatusText={addDesignFlow.exhaustedStatusText}
        isAdding={selectedDesign !== null && addDesignFlow.addingDesignId === selectedDesign.id}
        isInCurrentRequest={
          selectedDesign !== null &&
          (currentRequestAggregates.quantityByDesignId[selectedDesign.id] ?? 0) > 0
        }
        isOpen={selectedDesign !== null}
        navigationDesigns={reusableDesigns}
        onAddToRequest={addDesignFlow.addDesign}
        onClose={() => setSelectedDesign(null)}
        onOpenDesign={setSelectedDesign}
        onQuantityChange={addDesignFlow.setQuantity}
        onRemoveFromRequest={addDesignFlow.removeDesign}
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

      <PortalConfirmModal
        confirmLabel={addUploadFlow.isAdding ? 'Adding…' : 'Add to request'}
        isConfirmLoading={addUploadFlow.isAdding}
        isOpen={addUploadFlow.isConfirmOpen}
        onCancel={addUploadFlow.closeConfirm}
        onConfirm={() => {
          void addUploadFlow.confirmAdd();
        }}
        title="Add to request?"
      >
        <p className="portal-muted portal-confirm-modal-message">{addUploadFlow.confirmMessage}</p>
        {addUploadFlow.errorMessage ? (
          <p className="portal-muted portal-confirm-modal-message" role="alert">
            {addUploadFlow.errorMessage}
          </p>
        ) : null}
      </PortalConfirmModal>

      <PortalPickContinuableRequestModal
        continuableRequests={addDesignFlow.pickerContinuableRequests}
        designTitle={addDesignFlow.pendingDesign?.title}
        isAdding={addDesignFlow.isAdding}
        isOpen={addDesignFlow.isPickerOpen}
        onClose={addDesignFlow.closePicker}
        onSelectRequest={addDesignFlow.confirmPickRequest}
      />

      <PortalPickContinuableRequestModal
        continuableRequests={addUploadFlow.pickerContinuableRequests}
        designTitle={addUploadFlow.pendingItem?.title}
        isAdding={addUploadFlow.isAdding}
        isOpen={addUploadFlow.isPickerOpen}
        onClose={addUploadFlow.closePicker}
        onSelectRequest={addUploadFlow.confirmPickRequest}
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
