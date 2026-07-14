'use client';

import { useEffect, useMemo, useState } from 'react';

import { CatalogDesignDetailsModal } from '../../catalog/components/CatalogDesignDetailsModal';
import { CatalogSelectionCard } from '../../catalog/components/CatalogSelectionCard';
import { catalogService } from '../../catalog/services/catalogService';
import type { CatalogDesign } from '../../catalog/types/catalog.types';
import { useAddDesignToRequestFlow } from '../../print-requests/hooks/useAddDesignToRequestFlow';
import { usePortalPrintRequests } from '../../print-requests/context/PortalPrintRequestContext';
import { PortalConfirmModal } from '../../shared/components/PortalConfirmModal';
import { PortalPickContinuableRequestModal } from '../../shared/components/PortalPickContinuableRequestModal';
import { HeartIcon } from '../../shared/components/PortalIcons';
import { useFavorites } from '../context/FavoritesProvider';

export function FavoritesPageContent() {
  const { error: favoritesError, favoriteIds, isLoading: isFavoritesLoading, toggleFavorite } =
    useFavorites();
  const [designs, setDesigns] = useState<CatalogDesign[]>([]);
  const [isLoadingDesigns, setIsLoadingDesigns] = useState(false);
  const [designsError, setDesignsError] = useState<string | null>(null);
  const [selectedDesign, setSelectedDesign] = useState<CatalogDesign | null>(null);

  const {
    actionError: creationActionError,
    continuableRequests,
    createPrintRequest,
    currentRequestAggregates,
    refreshRequests,
    reloadWorkingItems,
  } = usePortalPrintRequests();

  const addDesignFlow = useAddDesignToRequestFlow({
    continuableRequests,
    createPrintRequest,
    onBeforeNavigate: () => setSelectedDesign(null),
    refreshRequests,
    reloadWorkingItems,
  });

  const favoriteIdList = useMemo(() => [...favoriteIds], [favoriteIds]);

  useEffect(() => {
    let isCancelled = false;

    async function loadFavoriteDesigns() {
      if (favoriteIdList.length === 0) {
        setDesigns([]);
        setDesignsError(null);
        setIsLoadingDesigns(false);
        return;
      }

      setIsLoadingDesigns(true);
      setDesignsError(null);

      try {
        const nextDesigns = await catalogService.getReadyDesignsByIds(favoriteIdList);

        if (!isCancelled) {
          setDesigns(nextDesigns);
        }
      } catch (loadError) {
        if (!isCancelled) {
          setDesigns([]);
          setDesignsError(
            loadError instanceof Error
              ? loadError.message
              : 'Unable to load favorites.',
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingDesigns(false);
        }
      }
    }

    void loadFavoriteDesigns();

    return () => {
      isCancelled = true;
    };
  }, [favoriteIdList]);

  const availableIds = useMemo(() => new Set(designs.map((design) => design.id)), [designs]);
  const unavailableIds =
    designsError || isLoadingDesigns
      ? []
      : favoriteIdList.filter((designId) => !availableIds.has(designId));

  const displayedActionError = creationActionError ?? addDesignFlow.actionError ?? favoritesError;
  const isLoading = isFavoritesLoading || isLoadingDesigns;

  return (
    <main className="portal-page portal-catalog-page">
      <header className="portal-page-header">
        <div className="portal-page-header-copy">
          <h1 className="portal-page-title portal-page-title-with-icon">
            <HeartIcon filled size={22} />
            My Favorites
          </h1>
          <p className="portal-lead">
            {favoriteIdList.length === 0
              ? 'Heart designs in the library to save them here.'
              : `${favoriteIdList.length} favorite${favoriteIdList.length === 1 ? '' : 's'}`}
          </p>
        </div>
      </header>

      {displayedActionError ? (
        <p className="portal-error" role="alert">
          {displayedActionError}
        </p>
      ) : null}

      {designsError ? (
        <p className="portal-error" role="alert">
          {designsError}
        </p>
      ) : null}

      {isLoading ? (
        <div className="design-library-loading-state">Loading favorites…</div>
      ) : favoriteIdList.length === 0 ? (
        <div className="design-library-empty-state">
          <p className="portal-eyebrow">Favorites</p>
          <h3>No favorites yet</h3>
          <p>Tap the heart on any catalog design to save it here.</p>
        </div>
      ) : (
        <>
          {designs.length > 0 ? (
            <div className="design-grid" role="list">
              {designs.map((design) => {
                const quantity =
                  currentRequestAggregates.primaryQuantityByDesignId[design.id] ??
                  currentRequestAggregates.quantityByDesignId[design.id] ??
                  0;
                const isSelected = (currentRequestAggregates.quantityByDesignId[design.id] ?? 0) > 0;

                return (
                  <div key={design.id} role="listitem">
                    <CatalogSelectionCard
                      design={design}
                      disabled={addDesignFlow.addingDesignId === design.id}
                      isSelected={isSelected}
                      onAdd={addDesignFlow.addDesign}
                      onOpenDetails={setSelectedDesign}
                      onQuantityChange={addDesignFlow.setQuantity}
                      onRemove={addDesignFlow.removeDesign}
                      quantity={quantity > 0 ? quantity : 1}
                    />
                  </div>
                );
              })}
            </div>
          ) : null}

          {unavailableIds.length > 0 ? (
            <section
              className="liked-unavailable-section"
              aria-label="Unavailable favorite designs"
            >
              <h2 className="liked-unavailable-title">No longer available</h2>
              <ul className="liked-unavailable-list">
                {unavailableIds.map((designId) => (
                  <li className="liked-unavailable-item" key={designId}>
                    <span>This design is no longer in the catalog.</span>
                    <button
                      className="portal-button portal-button-secondary portal-button-sm"
                      onClick={() => {
                        void toggleFavorite(designId);
                      }}
                      type="button"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}

      <CatalogDesignDetailsModal
        design={selectedDesign}
        isAdding={
          selectedDesign !== null && addDesignFlow.addingDesignId === selectedDesign.id
        }
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
    </main>
  );
}
