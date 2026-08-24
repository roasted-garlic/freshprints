'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import type { ShowProductionStatus } from '@fresh-prints/shared/types/upcomingShow/upcomingShow.enums';

import type { CatalogDesign } from '../../catalog/types/catalog.types';
import { CatalogDesignDetailsModal } from '../../catalog/components/CatalogDesignDetailsModal';
import { CatalogSelectionCard } from '../../catalog/components/CatalogSelectionCard';
import { catalogService, designHasMatchingDesignsHint } from '../../catalog/services/catalogService';
import { useAuth } from '../../auth/context/AuthContext';
import { usePortalPrintRequests } from '../../print-requests/context/PortalPrintRequestContext';
import { useAddDesignToRequestFlow } from '../../print-requests/hooks/useAddDesignToRequestFlow';
import { PortalLoadingPanel } from '../../shared/components/PortalLoadingPanel';
import { ArrowLeftIcon } from '../../shared/components/PortalIcons';
import { portalShowDesignsService } from '../services/portalShowDesignsService';
import { formatShowDesignGallerySubtitle } from '../utils/ourShowsLifecycle';

export function ShowDesignGalleryPageContent() {
  const params = useParams<{ showId: string }>();
  const showId = params.showId;
  const { isAuthenticated } = useAuth();
  const {
    continuableRequests,
    currentRequestAggregates,
    refreshRequests,
    reloadWorkingItems,
  } = usePortalPrintRequests();
  const addDesignFlow = useAddDesignToRequestFlow({
    continuableRequests,
    loginReturnTo: `/shows/${showId}`,
    refreshRequests,
    reloadWorkingItems,
  });
  const [designs, setDesigns] = useState<CatalogDesign[]>([]);
  const [scheduledStartAt, setScheduledStartAt] = useState<string | null>(null);
  const [productionStatus, setProductionStatus] = useState<ShowProductionStatus>('open');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDesignId, setSelectedDesignId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await portalShowDesignsService.listShowCatalogDesigns({ upcomingShowId: showId });
        const hydrated = await catalogService.getReadyDesignsByIds(result.designs.map((design) => design.id));
        if (!cancelled) {
          setDesigns(hydrated);
          setScheduledStartAt(result.scheduledStartAt);
          setProductionStatus(result.productionStatus ?? 'open');
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load show designs.');
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
  }, [showId]);

  const selectedDesign = useMemo(
    () => designs.find((design) => design.id === selectedDesignId) ?? null,
    [designs, selectedDesignId],
  );

  const openDesignDetails = (design: CatalogDesign) => {
    setSelectedDesignId(design.id);
  };

  return (
    <main className="portal-page">
      <header className="portal-catalog-topbar">
        <div className="portal-catalog-topbar-copy">
          <Link className="portal-catalog-back-link" href="/shows">
            <ArrowLeftIcon />
            Upcoming Shows
          </Link>
          <h1>Designs on this Whatnot show</h1>
          <p className="portal-muted portal-catalog-topbar-subtitle">
            {formatShowDesignGallerySubtitle({ productionStatus, scheduledStartAt })}
          </p>
        </div>
      </header>

      {isLoading ? <PortalLoadingPanel label="Loading show designs…" /> : null}
      {error ? <p className="portal-form-error">{error}</p> : null}

      {!isLoading && !error ? (
        designs.length === 0 ? (
          <p className="portal-muted">No public catalog designs are attached to this show yet.</p>
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
                    canAddPrints={addDesignFlow.canAddPrints}
                    design={design}
                    disabled={addDesignFlow.addingDesignId === design.id}
                    exhaustedHelperText={addDesignFlow.exhaustedHelperText}
                    exhaustedStatusText={addDesignFlow.exhaustedStatusText}
                    hasMatchingDesigns={designHasMatchingDesignsHint(design)}
                    isSelected={isSelected}
                    onAdd={isAuthenticated ? addDesignFlow.addDesign : undefined}
                    onOpenDetails={openDesignDetails}
                    onQuantityChange={isAuthenticated ? addDesignFlow.setQuantity : undefined}
                    onRemove={isAuthenticated ? addDesignFlow.removeDesign : undefined}
                    quantity={quantity > 0 ? quantity : 1}
                  />
                </div>
              );
            })}
          </div>
        )
      ) : null}

      <CatalogDesignDetailsModal
        canAddPrints={addDesignFlow.canAddPrints}
        currentRequestQuantity={
          selectedDesign ? currentRequestAggregates.quantityByDesignId[selectedDesign.id] ?? 0 : 0
        }
        design={selectedDesign}
        exhaustedStatusText={addDesignFlow.exhaustedStatusText}
        isInCurrentRequest={
          selectedDesign
            ? (currentRequestAggregates.quantityByDesignId[selectedDesign.id] ?? 0) > 0
            : false
        }
        isOpen={selectedDesign !== null}
        onAddToRequest={
          isAuthenticated && selectedDesign
            ? () => addDesignFlow.addDesign(selectedDesign)
            : undefined
        }
        onClose={() => setSelectedDesignId(null)}
        onQuantityChange={isAuthenticated ? addDesignFlow.setQuantity : undefined}
        onRemoveFromRequest={isAuthenticated ? addDesignFlow.removeDesign : undefined}
      />
    </main>
  );
}
