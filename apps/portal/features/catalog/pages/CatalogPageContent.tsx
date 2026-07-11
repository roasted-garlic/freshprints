'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  getCatalogDiscoveryModeLabel,
  parseCatalogDiscoveryMode,
  rankCatalogDiscoveryDesigns,
  type CatalogDiscoveryMode,
} from '@fresh-prints/shared/utils/catalogDiscoveryRanking';

import { CatalogDesignCard } from '../components/CatalogDesignCard';
import { CatalogDesignDetailsModal } from '../components/CatalogDesignDetailsModal';
import { CatalogFilterBar } from '../components/CatalogFilterBar';
import { CatalogSelectionCard } from '../components/CatalogSelectionCard';
import { CatalogTagFilterModal } from '../components/CatalogTagFilterModal';
import { useCatalogCategories } from '../hooks/useCatalogCategories';
import {
  useCatalogCategoryOptions,
  useCatalogDesigns,
  useFilteredCatalogDesigns,
} from '../hooks/useCatalogDesigns';
import type { CatalogDesign } from '../types/catalog.types';
import {
  filterCatalogDesignsByCategory,
  filterCatalogDesignsBySearch,
  sortCatalogTags,
} from '../utils/catalogSearch';
import { catalogStorageService } from '../services/catalogStorageService';
import { usePortalPrintRequests } from '../../print-requests/context/PortalPrintRequestContext';
import { useAddDesignToRequestFlow } from '../../print-requests/hooks/useAddDesignToRequestFlow';
import { usePortalPrintRequestSelectionMode } from '../../print-requests/hooks/usePortalPrintRequestSelectionMode';
import {
  buildCatalogLibraryHref,
  buildCatalogSelectionHref,
  CATALOG_HOME_PATH,
} from '../../print-requests/utils/catalogSelectionNavigation';
import { PortalConfirmModal } from '../../shared/components/PortalConfirmModal';
import { PortalPickContinuableRequestModal } from '../../shared/components/PortalPickContinuableRequestModal';
import {
  ArrowLeftIcon,
  PlayCircleIcon,
  PlusCircleIcon,
  SaveIcon,
  XIcon,
} from '../../shared/components/PortalIcons';

export function CatalogPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectionModeActive = searchParams.get('mode') === 'request-selection';
  const selectionRequestId = selectionModeActive ? searchParams.get('requestId') : null;
  const seedDesignId = selectionModeActive ? searchParams.get('seedDesignId') : null;
  const discoveryMode = parseCatalogDiscoveryMode(searchParams.get('discover'));
  const initialSearch = searchParams.get('q') ?? '';
  const initialCategory = searchParams.get('category') ?? '';
  const appliedSeedDesignIdRef = useRef<string | null>(null);

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isTagFilterModalOpen, setIsTagFilterModalOpen] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState<CatalogDesign | null>(null);
  const [selectionActionError, setSelectionActionError] = useState<string | null>(null);
  const [isLeavingSelection, setIsLeavingSelection] = useState(false);

  const {
    actionError: creationActionError,
    continuableRequests,
    createPrintRequest,
    finishCreating,
    handleStartRequestClick,
    isCreating,
    refreshRequests,
  } = usePortalPrintRequests();

  const closeDesignDetails = useCallback(() => {
    setSelectedDesign(null);
  }, []);

  const addDesignFlow = useAddDesignToRequestFlow({
    continuableRequests,
    createPrintRequest,
    onBeforeNavigate: closeDesignDetails,
    refreshRequests,
  });

  const selectionMode = usePortalPrintRequestSelectionMode(selectionRequestId);
  const { addDesign: addDesignToSelection } = selectionMode;
  const selectionError = selectionModeActive
    ? selectionRequestId
      ? selectionMode.error ??
        (!selectionMode.isLoading && !selectionMode.printRequest
          ? 'The selected print request could not be loaded. Return to Print Requests and choose a different request.'
          : null)
      : 'Choose a print request before adding designs from the library.'
    : null;

  const { categories } = useCatalogCategories();
  const { designs, error, isLoading } = useCatalogDesigns();

  const searchMatchedDesigns = useMemo(
    () => filterCatalogDesignsBySearch(designs, searchQuery),
    [designs, searchQuery],
  );

  const tagBaseDesigns = useMemo(
    () => filterCatalogDesignsByCategory(searchMatchedDesigns, categoryFilter || undefined),
    [categoryFilter, searchMatchedDesigns],
  );

  const filteredDesigns = useFilteredCatalogDesigns({
    designs,
    search: searchQuery,
    categoryId: categoryFilter || undefined,
    selectedTags,
  });

  const displayedDesigns = useMemo(() => {
    if (!discoveryMode) {
      return filteredDesigns;
    }

    return rankCatalogDiscoveryDesigns(filteredDesigns, discoveryMode);
  }, [discoveryMode, filteredDesigns]);

  const categoryOptions = useCatalogCategoryOptions(categories, designs, selectedTags, searchQuery);
  const activeCategoryName =
    categories.find((category) => category.id === categoryFilter)?.name ?? null;
  const curatedLibraryView = Boolean(discoveryMode || categoryFilter);

  const hasActiveFilters = Boolean(
    searchQuery.trim() || categoryFilter || selectedTags.length > 0 || discoveryMode,
  );

  const designCountLabel = `${displayedDesigns.length} design${displayedDesigns.length === 1 ? '' : 's'}`;

  function syncLibraryUrl(next: {
    discover?: CatalogDiscoveryMode | null;
    search?: string | null;
    categoryId?: string | null;
  }) {
    router.replace(
      buildCatalogLibraryHref({
        selectionMode: selectionModeActive,
        requestId: selectionRequestId,
        discover: next.discover === undefined ? discoveryMode : next.discover,
        search: next.search === undefined ? searchQuery : next.search,
        categoryId: next.categoryId === undefined ? categoryFilter : next.categoryId,
      }),
    );
  }

  function clearFilters() {
    setSearchQuery('');
    setCategoryFilter('');
    setSelectedTags([]);
    syncLibraryUrl({ discover: discoveryMode, search: '', categoryId: '' });
  }

  function handleCategoryChange(nextCategoryId: string) {
    setCategoryFilter(nextCategoryId);
    syncLibraryUrl({ categoryId: nextCategoryId || null });
  }

  function removeSelectedTag(tagToRemove: string) {
    setSelectedTags((currentTags) => currentTags.filter((tag) => tag !== tagToRemove));
  }

  const hasContinuableRequests = continuableRequests.length > 0;
  const hasSingleContinuableRequest = continuableRequests.length === 1;
  const requestActionLabel = hasContinuableRequests ? 'Continue request' : 'Start request';
  const requestActionPendingLabel = hasContinuableRequests ? 'Continuing…' : 'Starting…';

  const { resetTransientState } = addDesignFlow;

  useEffect(() => {
    setSearchQuery(searchParams.get('q') ?? '');
    setCategoryFilter(searchParams.get('category') ?? '');
  }, [searchParams]);

  useEffect(() => {
    if (!selectionModeActive) {
      appliedSeedDesignIdRef.current = null;
      return;
    }

    finishCreating();
    resetTransientState();
    void refreshRequests({ silent: true });
  }, [finishCreating, refreshRequests, resetTransientState, selectionModeActive]);

  useEffect(() => {
    if (!selectionModeActive || !selectionRequestId || !seedDesignId) {
      return;
    }

    if (appliedSeedDesignIdRef.current === seedDesignId) {
      return;
    }

    const seededDesign = designs.find((design) => design.id === seedDesignId);

    if (!seededDesign) {
      return;
    }

    appliedSeedDesignIdRef.current = seedDesignId;
    addDesignToSelection(seededDesign);
    router.replace(buildCatalogSelectionHref(selectionRequestId));
  }, [
    addDesignToSelection,
    designs,
    router,
    seedDesignId,
    selectionModeActive,
    selectionRequestId,
  ]);

  useEffect(() => {
    if (designs.length === 0) {
      return;
    }

    catalogStorageService.prefetchCatalogPaths(
      designs.map((design) => design.thumbnailPath),
      selectionModeActive ? 96 : 64,
    );
  }, [designs, selectionModeActive]);

  useEffect(() => {
    if (!selectionModeActive) {
      return;
    }

    catalogStorageService.prefetchCatalogPaths(
      Object.keys(selectionMode.selectedDesigns).map((designId) => {
        const design = designs.find((entry) => entry.id === designId);
        return design?.thumbnailPath ?? design?.previewPath;
      }),
      32,
    );
  }, [designs, selectionMode.selectedDesigns, selectionModeActive]);

  async function handleRequestAction() {
    if (hasSingleContinuableRequest) {
      router.push(buildCatalogSelectionHref(continuableRequests[0]!.id));
      return;
    }

    if (hasContinuableRequests) {
      router.push('/requests?tab=working');
      return;
    }

    handleStartRequestClick();
  }

  async function handleExitSelectionMode() {
    if (!selectionRequestId) {
      router.push('/requests?tab=working');
      return;
    }

    setIsLeavingSelection(true);

    try {
      // Removals (trash / qty→0) persist immediately; wait so Back doesn't race them.
      await selectionMode.flushPendingMutations();
      void refreshRequests({ silent: true });
      router.push(`/requests/${selectionRequestId}`);
    } catch (exitError) {
      setIsLeavingSelection(false);
      setSelectionActionError(
        exitError instanceof Error ? exitError.message : 'Unable to leave selection mode.',
      );
    }
  }

  async function handleSaveSelectionMode() {
    if (!selectionRequestId) {
      return;
    }

    setSelectionActionError(null);
    setIsLeavingSelection(true);

    try {
      await selectionMode.saveSelections({ skipReload: true });
      void refreshRequests({ silent: true });
      router.replace(`/requests/${selectionRequestId}`);
    } catch (saveError) {
      setIsLeavingSelection(false);
      setSelectionActionError(saveError instanceof Error ? saveError.message : 'Unable to save selections.');
    }
  }

  const displayedActionError = creationActionError ?? addDesignFlow.actionError ?? selectionActionError;
  // Never keep the creating overlay once selection mode is active (query-param nav keeps this page mounted).
  const pageBusy = !selectionModeActive && (isCreating || addDesignFlow.isAdding);

  const loadError = error ?? selectionError;

  return (
    <main
      className={`portal-page portal-catalog-page${selectionModeActive ? ' is-selection-mode' : ''}${pageBusy ? ' is-creating-request' : ''}${isLeavingSelection ? ' is-leaving-selection' : ''}`}
    >
      {!selectionModeActive ? (
        <header className="portal-catalog-topbar">
          <div className="portal-catalog-topbar-copy">
            <button
              className="portal-catalog-back-link"
              onClick={() => router.push(CATALOG_HOME_PATH)}
              type="button"
            >
              <ArrowLeftIcon />
              Discover
            </button>
            <h1>
              {discoveryMode
                ? getCatalogDiscoveryModeLabel(discoveryMode)
                : (activeCategoryName ?? 'Design Library')}
            </h1>
            <p className="portal-muted portal-catalog-topbar-subtitle">
              {curatedLibraryView
                ? 'Search and filters still apply to this list.'
                : 'Search and filter through our full design catalog'}
            </p>
          </div>

          <div className="portal-catalog-topbar-actions">
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
      ) : null}

      {loadError ? (
        <p className="portal-error" role="alert">
          {loadError}
        </p>
      ) : null}

      {displayedActionError ? (
        <p className="portal-error" role="alert">
          {displayedActionError}
        </p>
      ) : null}

      <section className="design-library-section">
        {selectionModeActive && selectionMode.printRequest ? (
          <>
            <div className="design-library-selection-tray">
              <div className="design-library-selection-tray-top">
                <div className="design-library-selection-tray-copy">
                  <p className="portal-eyebrow">Selection mode</p>
                  <h2 className="design-library-selection-tray-title">Add designs to request</h2>
                  <h3>{selectionMode.printRequest.name}</h3>
                  <p>
                    Pick designs and quantities below, then save. On the request page, set print
                    sizes—you can add the same design more than once for different sizes. Add to a
                    show&apos;s print run when you are ready.
                  </p>
                </div>
              </div>
            </div>

            <div className="design-library-selection-tray-sticky">
              <div className="design-library-selection-tray-stats">
                <span className="design-library-count-chip">
                  {selectionMode.selectedDesignCount} selected
                </span>
                <span className="design-library-count-chip">
                  {selectionMode.totalQuantity} total quantity
                </span>
              </div>

              <div className="design-library-selection-tray-actions">
                <button
                  className="portal-button portal-button-secondary portal-button-sm portal-button-leading-icon"
                  onClick={handleExitSelectionMode}
                  type="button"
                >
                  <ArrowLeftIcon />
                  Back
                </button>
                <button
                  className="portal-button portal-button-primary portal-button-sm portal-button-leading-icon"
                  disabled={selectionMode.isSaving || !selectionMode.hasPendingChanges}
                  onClick={() => void handleSaveSelectionMode()}
                  type="button"
                >
                  <SaveIcon />
                  {selectionMode.isSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </>
        ) : null}

        <div className="design-library-fixed-region">
          <div className="design-library-filter-dock">
            <div className="design-library-summary-row">
              <span className="design-library-count-chip">{designCountLabel}</span>
              {Boolean(searchQuery.trim() || categoryFilter || selectedTags.length > 0) ? (
                <button
                  className="portal-button portal-button-secondary portal-button-sm portal-button-leading-icon"
                  onClick={clearFilters}
                  type="button"
                >
                  <XIcon size={14} />
                  Clear filters
                </button>
              ) : null}
            </div>

            <CatalogFilterBar
              categoryFilter={categoryFilter}
              categoryOptions={categoryOptions}
              onCategoryChange={handleCategoryChange}
              onOpenTags={() => setIsTagFilterModalOpen(true)}
              onSearchChange={setSearchQuery}
              searchQuery={searchQuery}
              selectedTagCount={selectedTags.length}
            />
          </div>

          {selectedTags.length > 0 ? (
            <div aria-label="Active tag filters" className="design-library-active-tags">
              <span className="design-library-active-tags-label">Tags:</span>
              {selectedTags.map((tag) => (
                <span className="design-library-active-tag" key={tag}>
                  <span>{tag}</span>
                  <button
                    aria-label={`Remove ${tag} tag filter`}
                    className="design-library-active-tag-remove"
                    onClick={() => removeSelectedTag(tag)}
                    type="button"
                  >
                    <XIcon size={12} />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="design-library-catalog-scroll">
          {isLoading || (selectionModeActive && selectionMode.isLoading) ? (
            <div className="design-library-loading-state">Loading design library…</div>
          ) : displayedDesigns.length === 0 ? (
            <div className="design-library-empty-state">
              <p className="portal-eyebrow">Design library</p>
              <h3>{hasActiveFilters ? 'No designs found' : 'No designs yet'}</h3>
              <p>
                {hasActiveFilters
                  ? 'Try adjusting your search, category, tag, or discovery filters.'
                  : 'Designs you can use for print requests will appear here.'}
              </p>
            </div>
          ) : selectionModeActive ? (
            <div className="design-grid" role="list">
              {displayedDesigns.map((design) => {
                const selection = selectionMode.selectedDesigns[design.id];

                return (
                  <div key={design.id} role="listitem">
                    <CatalogSelectionCard
                      design={design}
                      isSelected={Boolean(selection)}
                      onAdd={selectionMode.addDesign}
                      onQuantityChange={selectionMode.setQuantity}
                      onRemove={(designId) => void selectionMode.removeDesign(designId)}
                      quantity={selection?.quantity ?? 1}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="design-grid" role="list">
              {displayedDesigns.map((design) => (
                <div key={design.id} role="listitem">
                  <CatalogDesignCard
                    design={design}
                    isAdding={addDesignFlow.addingDesignId === design.id}
                    onAddToRequest={addDesignFlow.requestAddDesign}
                    onSelect={setSelectedDesign}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {!selectionModeActive ? (
        <CatalogDesignDetailsModal
          design={selectedDesign}
          isAdding={selectedDesign !== null && addDesignFlow.addingDesignId === selectedDesign.id}
          isOpen={selectedDesign !== null}
          onAddToRequest={addDesignFlow.requestAddDesign}
          onClose={closeDesignDetails}
        />
      ) : null}

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

      <CatalogTagFilterModal
        baseDesigns={tagBaseDesigns}
        isOpen={isTagFilterModalOpen}
        onApply={(nextTags) => setSelectedTags(sortCatalogTags(nextTags))}
        onClose={() => setIsTagFilterModalOpen(false)}
        selectedTags={selectedTags}
      />
    </main>
  );
}
