'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useMemo, useState } from 'react';

import {
  CATALOG_DISCOVERY_MODES,
  getCatalogDiscoveryModeLabel,
  rankCatalogDiscoveryDesigns,
  takeCatalogDiscoveryRail,
  type CatalogDiscoveryMode,
} from '@fresh-prints/shared/utils/catalogDiscoveryRanking';

import { useAuth } from '../../auth/context/AuthContext';
import { useCatalogCategories } from '../hooks/useCatalogCategories';
import type { CatalogDesign } from '../types/catalog.types';
import { usePortalPrintRequests } from '../../print-requests/context/PortalPrintRequestContext';
import { useAddDesignToRequestFlow } from '../../print-requests/hooks/useAddDesignToRequestFlow';
import {
  buildCatalogLibraryHref,
  CATALOG_LIBRARY_PATH,
} from '../../print-requests/utils/catalogSelectionNavigation';
import { PortalConfirmModal } from '../../shared/components/PortalConfirmModal';
import { PortalPickContinuableRequestModal } from '../../shared/components/PortalPickContinuableRequestModal';
import { BookSearchIcon, GlobeIcon, SearchIcon } from '../../shared/components/PortalIcons';
import { CatalogCompanionSuggestionModal } from '../components/CatalogCompanionSuggestionModal';
import { CatalogDesignDetailsModal } from '../components/CatalogDesignDetailsModal';
import { CatalogDiscoveryCarousel } from '../components/CatalogDiscoveryCarousel';
import { CatalogSelectionCard } from '../components/CatalogSelectionCard';
import { designHasMatchingDesignsHint } from '../services/catalogService';
import {
  buildDiscoverSearchPlaceholder,
  CATALOG_FIRST_VIEWPORT_EAGER_COUNT,
  useCatalogHomeDesigns,
} from '../hooks/useCatalogDesigns';
import { useCatalogDesignDeepLink } from '../hooks/useCatalogDesignDeepLink';

export function CatalogHomePageContent() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [landingSearch, setLandingSearch] = useState('');
  const [selectedDesign, setSelectedDesign] = useState<CatalogDesign | null>(null);

  const {
    actionError: creationActionError,
    continuableRequests,
    createPrintRequest,
    currentRequestAggregates,
    isCreating,
    refreshRequests,
    reloadWorkingItems,
  } = usePortalPrintRequests();

  const { closeDesignDetails, deepLinkError, openDesignDetails } = useCatalogDesignDeepLink({
    selectedDesign,
    setSelectedDesign,
  });

  const addDesignFlow = useAddDesignToRequestFlow({
    continuableRequests,
    createPrintRequest,
    onBeforeNavigate: closeDesignDetails,
    refreshRequests,
    reloadWorkingItems,
  });

  const { categories } = useCatalogCategories();
  const { designs, categoryRails: hydratedCategoryRails, error, isLoading, readyLibraryCount } =
    useCatalogHomeDesigns(categories);

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
      hydratedCategoryRails.map((rail) => ({
        key: `category:${rail.categoryId}`,
        title: rail.name,
        designs: rail.designs,
        discover: undefined as CatalogDiscoveryMode | undefined,
        categoryId: rail.categoryId,
      })),
    [hydratedCategoryRails],
  );

  const homeRails = useMemo(() => [...discoveryRails, ...categoryRails], [categoryRails, discoveryRails]);

  const pageBusy = isCreating;

  function openLibrary(options?: {
    discover?: CatalogDiscoveryMode;
    search?: string;
    categoryId?: string;
  }) {
    // Soft nav can keep the discover page's scroll offset on mobile; force top
    // before push so the filtered library never opens mid-page.
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    router.push(
      buildCatalogLibraryHref({
        discover: options?.discover ?? null,
        search: options?.search ?? null,
        categoryId: options?.categoryId ?? null,
      }),
      { scroll: true },
    );
  }

  function handleLandingSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = landingSearch.trim();
    openLibrary({ search: query || undefined });
  }

  const searchPlaceholder = buildDiscoverSearchPlaceholder(readyLibraryCount);

  const displayedActionError = creationActionError ?? addDesignFlow.actionError ?? deepLinkError;

  return (
    <main
      className={`portal-page portal-catalog-page portal-catalog-home${pageBusy ? ' is-creating-request' : ''}`}
    >
      <header className="catalog-home-toolbar">
        <div className="catalog-home-toolbar-brand">
          <span aria-hidden className="catalog-home-toolbar-mark">
            <BookSearchIcon size={18} />
          </span>
          <div className="catalog-home-toolbar-copy">
            <h1>Discover</h1>
            <p>Fresh picks for your next print</p>
          </div>
        </div>

        <form className="catalog-home-search" onSubmit={handleLandingSearchSubmit}>
          <label className="catalog-home-search-pill">
            <span className="portal-visually-hidden">Search designs</span>
            <span aria-hidden className="catalog-home-search-leading">
              <SearchIcon size={18} />
            </span>
            <input
              className="catalog-home-search-input"
              onChange={(event) => setLandingSearch(event.target.value)}
              placeholder={searchPlaceholder}
              type="search"
              value={landingSearch}
            />
            <button
              aria-label="Search"
              className="catalog-home-search-submit"
              type="submit"
            >
              <SearchIcon size={16} />
            </button>
          </label>
        </form>

        <div className="catalog-home-toolbar-actions">
          <button
            aria-label="Browse all designs"
            className="catalog-home-browse-button"
            onClick={() => openLibrary()}
            type="button"
          >
            <GlobeIcon size={18} />
            <span className="catalog-home-browse-label catalog-home-browse-label-full">
              Browse all
            </span>
            <span className="catalog-home-browse-label catalog-home-browse-label-short">
              Browse
            </span>
          </button>
        </div>
      </header>

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

      {addDesignFlow.companionSuggestion ? (
        <CatalogCompanionSuggestionModal
          addingDesignId={addDesignFlow.addingDesignId}
          canAdd={isAuthenticated && addDesignFlow.canAddPrints}
          onAdd={addDesignFlow.addDesignFromCompanionSuggestion}
          onDismiss={addDesignFlow.dismissCompanionSuggestion}
          onOpenDetails={openDesignDetails}
          suggestion={addDesignFlow.companionSuggestion}
        />
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
              {section.designs.map((design, index) => {
                const quantity =
                  currentRequestAggregates.primaryQuantityByDesignId[design.id] ??
                  currentRequestAggregates.quantityByDesignId[design.id] ??
                  0;
                const isSelected = (currentRequestAggregates.quantityByDesignId[design.id] ?? 0) > 0;

                return (
                  <div className="catalog-discovery-rail-item" key={design.id}>
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
                      prioritizeLoading={index < CATALOG_FIRST_VIEWPORT_EAGER_COUNT}
                      quantity={quantity > 0 ? quantity : 1}
                    />
                  </div>
                );
              })}
            </CatalogDiscoveryCarousel>
          ))}
        </div>
      )}

      <CatalogDesignDetailsModal
        addingDesignId={addDesignFlow.addingDesignId}
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
        isAdding={
          selectedDesign !== null &&
          (addDesignFlow.addingDesignId === selectedDesign.id || addDesignFlow.isEnsuringWorkingRequest)
        }
        isInCurrentRequest={
          selectedDesign !== null &&
          (currentRequestAggregates.quantityByDesignId[selectedDesign.id] ?? 0) > 0
        }
        isOpen={selectedDesign !== null}
        onOpenDesign={openDesignDetails}
        onAddToRequest={isAuthenticated ? addDesignFlow.addDesign : undefined}
        onClose={closeDesignDetails}
        onQuantityChange={isAuthenticated ? addDesignFlow.setQuantity : undefined}
        onRemoveFromRequest={isAuthenticated ? addDesignFlow.removeDesign : undefined}
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
