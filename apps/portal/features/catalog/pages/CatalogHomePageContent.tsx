'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';

import {
  CATALOG_DISCOVERY_MODES,
  getCatalogDiscoveryModeLabel,
  rankCatalogDiscoveryDesigns,
  selectTopPopularCategoryRails,
  takeCatalogDiscoveryRail,
  type CatalogDiscoveryMode,
} from '@fresh-prints/shared/utils/catalogDiscoveryRanking';

import { CatalogDesignCard } from '../components/CatalogDesignCard';
import { CatalogDesignDetailsModal } from '../components/CatalogDesignDetailsModal';
import { CatalogDiscoveryCarousel } from '../components/CatalogDiscoveryCarousel';
import { useCatalogCategories } from '../hooks/useCatalogCategories';
import { useCatalogDesigns } from '../hooks/useCatalogDesigns';
import type { CatalogDesign } from '../types/catalog.types';
import { catalogStorageService } from '../services/catalogStorageService';
import { usePortalPrintRequests } from '../../print-requests/context/PortalPrintRequestContext';
import { useAddDesignToRequestFlow } from '../../print-requests/hooks/useAddDesignToRequestFlow';
import {
  buildCatalogLibraryHref,
  buildCatalogSelectionHref,
  CATALOG_LIBRARY_PATH,
} from '../../print-requests/utils/catalogSelectionNavigation';
import { PortalConfirmModal } from '../../shared/components/PortalConfirmModal';
import { PortalPickContinuableRequestModal } from '../../shared/components/PortalPickContinuableRequestModal';
import {
  PlayCircleIcon,
  PlusCircleIcon,
  SearchIcon,
} from '../../shared/components/PortalIcons';

export function CatalogHomePageContent() {
  const router = useRouter();
  const [landingSearch, setLandingSearch] = useState('');
  const [selectedDesign, setSelectedDesign] = useState<CatalogDesign | null>(null);

  const {
    actionError: creationActionError,
    continuableRequests,
    createPrintRequest,
    handleStartRequestClick,
    isCreating,
    refreshRequests,
  } = usePortalPrintRequests();

  const closeDesignDetails = () => setSelectedDesign(null);

  const addDesignFlow = useAddDesignToRequestFlow({
    continuableRequests,
    createPrintRequest,
    onBeforeNavigate: closeDesignDetails,
    refreshRequests,
  });

  const { categories } = useCatalogCategories();
  const { designs, error, isLoading } = useCatalogDesigns();

  const discoveryRails = useMemo(
    () =>
      CATALOG_DISCOVERY_MODES.map((mode) => {
        const ranked = rankCatalogDiscoveryDesigns(designs, mode);
        return {
          key: `mode:${mode}`,
          title: getCatalogDiscoveryModeLabel(mode),
          designs: takeCatalogDiscoveryRail(ranked),
          discover: mode as CatalogDiscoveryMode,
          categoryId: undefined as string | undefined,
        };
      }).filter((section) => section.designs.length > 0),
    [designs],
  );

  const categoryRails = useMemo(
    () =>
      selectTopPopularCategoryRails(designs, categories).map((rail) => ({
        key: `category:${rail.categoryId}`,
        title: rail.name,
        designs: rail.designs,
        discover: undefined as CatalogDiscoveryMode | undefined,
        categoryId: rail.categoryId,
      })),
    [categories, designs],
  );

  const homeRails = useMemo(() => [...discoveryRails, ...categoryRails], [categoryRails, discoveryRails]);

  useEffect(() => {
    if (designs.length === 0) {
      return;
    }

    catalogStorageService.prefetchCatalogPaths(
      designs.map((design) => design.thumbnailPath),
      72,
    );
  }, [designs]);

  const hasContinuableRequests = continuableRequests.length > 0;
  const hasSingleContinuableRequest = continuableRequests.length === 1;
  const requestActionLabel = hasContinuableRequests ? 'Continue request' : 'Start request';
  const requestActionPendingLabel = hasContinuableRequests ? 'Continuing…' : 'Starting…';
  const pageBusy = isCreating || addDesignFlow.isAdding;

  function openLibrary(options?: {
    discover?: CatalogDiscoveryMode;
    search?: string;
    categoryId?: string;
  }) {
    router.push(
      buildCatalogLibraryHref({
        discover: options?.discover ?? null,
        search: options?.search ?? null,
        categoryId: options?.categoryId ?? null,
      }),
    );
  }

  function handleLandingSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = landingSearch.trim();
    openLibrary({ search: query || undefined });
  }

  function handleRequestAction() {
    if (hasSingleContinuableRequest) {
      router.push(
        buildCatalogSelectionHref(continuableRequests[0]!.id, { from: 'discover' }),
      );
      return;
    }

    if (hasContinuableRequests) {
      router.push('/requests?tab=working');
      return;
    }

    handleStartRequestClick({ from: 'discover' });
  }

  const displayedActionError = creationActionError ?? addDesignFlow.actionError;

  return (
    <main
      className={`portal-page portal-catalog-page portal-catalog-home${pageBusy ? ' is-creating-request' : ''}`}
    >
      <header className="catalog-home-toolbar">
        <div className="catalog-home-toolbar-brand">
          <h1>Discover Designs</h1>
        </div>

        <form className="catalog-home-search" onSubmit={handleLandingSearchSubmit}>
          <label className="catalog-home-search-pill">
            <span className="portal-visually-hidden">Search the Design Library</span>
            <input
              className="catalog-home-search-input"
              onChange={(event) => setLandingSearch(event.target.value)}
              placeholder="Search designs…"
              type="search"
              value={landingSearch}
            />
            <button
              aria-label="Search"
              className="catalog-home-search-submit"
              type="submit"
            >
              <SearchIcon />
            </button>
          </label>
        </form>

        <div className="catalog-home-toolbar-actions">
          <button
            className="portal-button portal-button-secondary catalog-home-pill-button"
            onClick={() => openLibrary()}
            type="button"
          >
            Browse
          </button>
          <button
            className="portal-button portal-button-primary portal-button-leading-icon"
            disabled={pageBusy}
            onClick={() => void handleRequestAction()}
            type="button"
          >
            {hasContinuableRequests ? <PlayCircleIcon /> : <PlusCircleIcon />}
            {isCreating ? requestActionPendingLabel : requestActionLabel}
          </button>
        </div>
      </header>

      <aside className="portal-catalog-request-workflow-hint" role="note">
        <p className="portal-catalog-request-workflow-hint-title">How print requests work</p>
        <p className="portal-catalog-request-workflow-hint-body">
          A print request can include designs from the Design Library, artwork you upload yourself, or
          both. Uploaded artwork is for your request only — it is not automatically added to the shared
          Design Library.
        </p>
      </aside>

      {error ? (
        <p className="portal-error" role="alert">
          {error}
        </p>
      ) : null}

      {displayedActionError ? (
        <p className="portal-error" role="alert">
          {displayedActionError}
        </p>
      ) : null}

      {isLoading ? (
        <div className="design-library-loading-state">Loading designs…</div>
      ) : homeRails.length === 0 ? (
        <div className="design-library-empty-state">
          <p className="portal-eyebrow">Designs</p>
          <h3>No designs yet</h3>
          <p>Designs you can use for print requests will appear here.</p>
          <button
            className="portal-button portal-button-secondary"
            onClick={() => router.push(CATALOG_LIBRARY_PATH)}
            type="button"
          >
            Open Design Library
          </button>
        </div>
      ) : (
        <div className="catalog-discovery-home">
          {homeRails.map((section) => (
            <CatalogDiscoveryCarousel
              key={section.key}
              onViewAll={() =>
                openLibrary({
                  discover: section.discover,
                  categoryId: section.categoryId,
                })
              }
              title={section.title}
            >
              {section.designs.map((design) => (
                <div className="catalog-discovery-rail-item" key={design.id}>
                  <CatalogDesignCard
                    design={design}
                    isAdding={addDesignFlow.addingDesignId === design.id}
                    onAddToRequest={addDesignFlow.requestAddDesign}
                    onSelect={setSelectedDesign}
                  />
                </div>
              ))}
            </CatalogDiscoveryCarousel>
          ))}
        </div>
      )}

      <CatalogDesignDetailsModal
        design={selectedDesign}
        isAdding={selectedDesign !== null && addDesignFlow.addingDesignId === selectedDesign.id}
        isOpen={selectedDesign !== null}
        onAddToRequest={addDesignFlow.requestAddDesign}
        onClose={closeDesignDetails}
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
