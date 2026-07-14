'use client';

import { FirebaseError } from 'firebase/app';
import { useEffect, useMemo, useRef, useState } from 'react';

import { CatalogDesignDetailsModal } from '../../catalog/components/CatalogDesignDetailsModal';
import { CatalogSelectionCard } from '../../catalog/components/CatalogSelectionCard';
import { catalogService } from '../../catalog/services/catalogService';
import type { CatalogDesign } from '../../catalog/types/catalog.types';
import { useAddDesignToRequestFlow } from '../../print-requests/hooks/useAddDesignToRequestFlow';
import { usePortalPrintRequests } from '../../print-requests/context/PortalPrintRequestContext';
import { PortalConfirmModal } from '../../shared/components/PortalConfirmModal';
import { PortalPickContinuableRequestModal } from '../../shared/components/PortalPickContinuableRequestModal';
import { HeartIcon, XIcon } from '../../shared/components/PortalIcons';
import { useFavorites } from '../context/FavoritesProvider';

function isPermissionDeniedError(error: unknown): boolean {
  if (error instanceof FirebaseError) {
    return error.code === 'permission-denied';
  }

  return error instanceof Error && /insufficient permissions/i.test(error.message);
}

function formatRemovedFavoritesMessage(count: number): string {
  if (count === 1) {
    return '1 favorite was removed from the catalog and will no longer show here.';
  }

  return `${count} favorites were removed from the catalog and will no longer show here.`;
}

export function FavoritesPageContent() {
  const {
    error: favoritesError,
    favoriteIds,
    isLoading: isFavoritesLoading,
    pruneUnavailableFavorites,
  } = useFavorites();
  const [designs, setDesigns] = useState<CatalogDesign[]>([]);
  const [isLoadingDesigns, setIsLoadingDesigns] = useState(false);
  const [designsError, setDesignsError] = useState<string | null>(null);
  const [selectedDesign, setSelectedDesign] = useState<CatalogDesign | null>(null);
  const [removalNotice, setRemovalNotice] = useState<string | null>(null);
  const pruneInFlightRef = useRef(false);
  /** Avoid re-pruning the same ids if the effect re-runs mid-flight. */
  const prunedIdsRef = useRef<Set<string>>(new Set());

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
        if (!isCancelled) {
          setDesigns([]);
          setDesignsError(null);
          setIsLoadingDesigns(false);
        }
        return;
      }

      if (!isCancelled) {
        setIsLoadingDesigns(true);
        setDesignsError(null);
      }

      try {
        const nextDesigns = await catalogService.getReadyDesignsByIds(favoriteIdList);
        if (isCancelled) {
          return;
        }

        const readyIds = new Set(nextDesigns.map((design) => design.id));
        const unavailableIds = favoriteIdList.filter(
          (designId) => !readyIds.has(designId) && !prunedIdsRef.current.has(designId),
        );

        setDesigns(nextDesigns);
        setDesignsError(null);

        if (unavailableIds.length > 0 && !pruneInFlightRef.current) {
          pruneInFlightRef.current = true;
          for (const designId of unavailableIds) {
            prunedIdsRef.current.add(designId);
          }
          // Banner first — prune updates favoriteIds and can remount this effect.
          setRemovalNotice(formatRemovedFavoritesMessage(unavailableIds.length));
          try {
            await pruneUnavailableFavorites(unavailableIds);
          } finally {
            pruneInFlightRef.current = false;
          }
        }
      } catch (loadError) {
        if (!isCancelled) {
          setDesigns([]);
          setDesignsError(
            isPermissionDeniedError(loadError)
              ? null
              : loadError instanceof Error
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
  }, [favoriteIdList, pruneUnavailableFavorites]);

  const rawActionError = creationActionError ?? addDesignFlow.actionError ?? favoritesError;
  const displayedActionError =
    rawActionError && /insufficient permissions/i.test(rawActionError) ? null : rawActionError;
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

      {removalNotice ? (
        <div className="favorites-removal-notice" role="status">
          <p className="favorites-removal-notice-message">{removalNotice}</p>
          <button
            aria-label="Dismiss notification"
            className="favorites-removal-notice-dismiss"
            onClick={() => setRemovalNotice(null)}
            type="button"
          >
            <XIcon size={16} />
          </button>
        </div>
      ) : null}

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
