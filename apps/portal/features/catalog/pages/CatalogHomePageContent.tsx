'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useMemo, useState, type ReactNode } from 'react';

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
import { usePortalShowHomeRails } from '../../show-designs/hooks/usePortalShowHomeRails';
import type { PortalShowHomeRailSlot } from '../../show-designs/hooks/usePortalShowHomeRails';
import {
  designsForShowHomeRailPresentation,
  type PortalShowHomeRail,
} from '../../show-designs/services/portalShowDiscoveryContent';
import { useCatalogDesignDeepLink } from '../hooks/useCatalogDesignDeepLink';

interface CatalogHomeRailSection {
  categoryId?: string;
  designs: CatalogDesign[];
  discover?: CatalogDiscoveryMode;
  key: string;
  showId?: string;
  title: string;
}

const NEXT_SHOW_LOADING_TITLE = 'Next Show';
const THIS_WEEK_LOADING_TITLE = 'Added to Shows This Week';

function CatalogDiscoveryRailLoadingSection({
  message,
  title,
}: {
  message: string;
  title: string;
}) {
  return (
    <section aria-busy="true" aria-label={title} className="catalog-discovery-section">
      <header className="catalog-discovery-section-header">
        <h2 className="catalog-discovery-section-title">{title}</h2>
      </header>
      <div className="design-library-loading-state">{message}</div>
    </section>
  );
}

function CatalogDiscoveryRailErrorSection({ error, title }: { error: string; title: string }) {
  return (
    <section aria-label={title} className="catalog-discovery-section">
      <header className="catalog-discovery-section-header">
        <h2 className="catalog-discovery-section-title">{title}</h2>
      </header>
      <p className="portal-error" role="alert">
        {error}
      </p>
    </section>
  );
}

function showHomeRailToSection(rail: PortalShowHomeRail): CatalogHomeRailSection {
  return {
    categoryId: undefined,
    designs: designsForShowHomeRailPresentation(rail),
    discover: rail.viewAllDiscover,
    key: rail.key,
    showId: rail.viewAllShowId,
    title: rail.title,
  };
}

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
  const { nextShow, thisWeek } = usePortalShowHomeRails();

  const discoveryRails = useMemo(
    (): CatalogHomeRailSection[] =>
      CATALOG_DISCOVERY_MODES.map((mode) => {
        const ranked = rankCatalogDiscoveryDesigns(designs, mode);
        return {
          key: `mode:${mode}`,
          title: getCatalogDiscoveryModeLabel(mode),
          designs: takeCatalogDiscoveryRail(ranked),
          discover: mode,
          categoryId: undefined,
        };
      }).filter((section) => section.designs.length > 0),
    [designs],
  );

  const categoryRails = useMemo(
    (): CatalogHomeRailSection[] =>
      hydratedCategoryRails.map((rail) => ({
        key: `category:${rail.categoryId}`,
        title: rail.name,
        designs: rail.designs,
        categoryId: rail.categoryId,
      })),
    [hydratedCategoryRails],
  );

  const { discoveryAfterShow, discoveryBeforeShow } = useMemo(() => {
    const newIndex = discoveryRails.findIndex((section) => section.discover === 'new');
    if (newIndex < 0) {
      return {
        discoveryBeforeShow: [] as CatalogHomeRailSection[],
        discoveryAfterShow: discoveryRails,
      };
    }

    return {
      discoveryBeforeShow: discoveryRails.slice(0, newIndex + 1),
      discoveryAfterShow: discoveryRails.slice(newIndex + 1),
    };
  }, [discoveryRails]);

  const homeRailSections = useMemo((): CatalogHomeRailSection[] => {
    const showRails: CatalogHomeRailSection[] = [];
    if (nextShow.rail) {
      showRails.push(showHomeRailToSection(nextShow.rail));
    }
    if (thisWeek.rail) {
      showRails.push(showHomeRailToSection(thisWeek.rail));
    }
    return [
      ...discoveryBeforeShow,
      ...showRails,
      ...discoveryAfterShow,
      ...categoryRails,
    ];
  }, [categoryRails, discoveryAfterShow, discoveryBeforeShow, nextShow.rail, thisWeek.rail]);

  const navigationDesigns = useMemo((): CatalogDesign[] => {
    if (!selectedDesign) {
      return [];
    }
    const containingRail = homeRailSections.find((section) =>
      section.designs.some((entry) => entry.id === selectedDesign.id),
    );
    return containingRail?.designs ?? [selectedDesign];
  }, [homeRailSections, selectedDesign]);

  const hasCatalogRails = discoveryRails.length > 0 || categoryRails.length > 0;
  const hasShowRailContent = Boolean(nextShow.rail || thisWeek.rail);
  const hasShowRailPending = nextShow.isLoading || thisWeek.isLoading;
  const showDiscoverEmpty =
    !isLoading && !hasCatalogRails && !hasShowRailContent && !hasShowRailPending;

  const pageBusy = isCreating;

  function openLibrary(options?: {
    discover?: CatalogDiscoveryMode;
    search?: string;
    categoryId?: string;
    showId?: string;
  }) {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    router.push(
      buildCatalogLibraryHref({
        discover: options?.discover ?? null,
        search: options?.search ?? null,
        categoryId: options?.categoryId ?? null,
        showId: options?.showId ?? null,
      }),
      { scroll: true },
    );
  }

  function handleLandingSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = landingSearch.trim();
    openLibrary({ search: query || undefined });
  }

  function renderRailSection(section: CatalogHomeRailSection) {
    return (
      <CatalogDiscoveryCarousel
        key={section.key}
        onViewAll={() =>
          openLibrary({
            discover: section.discover,
            categoryId: section.categoryId,
            showId: section.showId,
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
    );
  }

  function renderShowRailSlot(
    slot: PortalShowHomeRailSlot,
    options: {
      loadingMessage: string;
      loadingTitle: string;
    },
  ): ReactNode {
    if (slot.isLoading) {
      return (
        <CatalogDiscoveryRailLoadingSection
          key={options.loadingTitle}
          message={options.loadingMessage}
          title={options.loadingTitle}
        />
      );
    }

    if (slot.error) {
      return (
        <CatalogDiscoveryRailErrorSection
          key={options.loadingTitle}
          error={slot.error}
          title={slot.rail?.title ?? options.loadingTitle}
        />
      );
    }

    if (!slot.rail) {
      return null;
    }

    return renderRailSection(showHomeRailToSection(slot.rail));
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
      ) : showDiscoverEmpty ? (
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
          {discoveryBeforeShow.map((section) => renderRailSection(section))}
          {renderShowRailSlot(nextShow, {
            loadingMessage: 'Loading Next Show designs…',
            loadingTitle: NEXT_SHOW_LOADING_TITLE,
          })}
          {renderShowRailSlot(thisWeek, {
            loadingMessage: "Loading this week's designs…",
            loadingTitle: THIS_WEEK_LOADING_TITLE,
          })}
          {discoveryAfterShow.map((section) => renderRailSection(section))}
          {categoryRails.map((section) => renderRailSection(section))}
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
        navigationDesigns={navigationDesigns}
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
        continuableRequests={addDesignFlow.pickerContinuableRequests}
        designTitle={addDesignFlow.pendingDesign?.title}
        isAdding={addDesignFlow.isAdding}
        isOpen={addDesignFlow.isPickerOpen}
        onClose={addDesignFlow.closePicker}
        onSelectRequest={addDesignFlow.confirmPickRequest}
      />
    </main>
  );
}
