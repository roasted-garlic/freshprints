'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  getCatalogDiscoveryModeLabel,
  parseCatalogDiscoveryMode,
  type CatalogDiscoveryMode,
} from '@fresh-prints/shared/utils/catalogDiscoveryRanking';

import { useAuth } from '../../auth/context/AuthContext';
import { CatalogCompanionSuggestionModal } from '../components/CatalogCompanionSuggestionModal';
import { CatalogDesignDetailsModal } from '../components/CatalogDesignDetailsModal';
import { CatalogFilterBar } from '../components/CatalogFilterBar';
import { CatalogSelectionCard } from '../components/CatalogSelectionCard';
import { designHasMatchingDesignsHint } from '../services/catalogService';
import { CATALOG_FIRST_VIEWPORT_EAGER_COUNT } from '../hooks/useCatalogDesigns';

/** Bound Algolia/search requests while typing — do not fire per raw keystroke. */
export const CATALOG_SEARCH_DEBOUNCE_MS = 300;
import { CatalogTagFilterModal } from '../components/CatalogTagFilterModal';
import { useCatalogDesignDeepLink } from '../hooks/useCatalogDesignDeepLink';
import { useCatalogCategories } from '../hooks/useCatalogCategories';
import {
  useCatalogCategoryOptions,
  useCatalogDesigns,
} from '../hooks/useCatalogDesigns';
import { useCatalogTags } from '../hooks/useCatalogTags';
import {
  countVisibleSelectedTags,
  selectedTagsIncludeHalftone,
  setHalftoneInSelectedTags,
  sortCatalogTags,
  visibleSelectedTags,
} from '../utils/catalogSearch';
import type { CatalogDesign } from '../types/catalog.types';
import { usePortalPrintRequests } from '../../print-requests/context/PortalPrintRequestContext';
import { useAddDesignToRequestFlow } from '../../print-requests/hooks/useAddDesignToRequestFlow';
import { usePortalPrintRequestSelectionMode } from '../../print-requests/hooks/usePortalPrintRequestSelectionMode';
import {
  buildCatalogLibraryHref,
  buildCatalogSelectionHref,
  buildRequestUploadHref,
  CATALOG_HOME_PATH,
} from '../../print-requests/utils/catalogSelectionNavigation';
import {
  buildRequestDetailHref,
  parsePortalRequestDetailFrom,
} from '../../print-requests/utils/portalRequestDetailReturn';
import { PortalConfirmModal } from '../../shared/components/PortalConfirmModal';
import { PortalPickContinuableRequestModal } from '../../shared/components/PortalPickContinuableRequestModal';
import {
  ArrowLeftIcon,
  ImagePlusIcon,
  SaveIcon,
  XIcon,
} from '../../shared/components/PortalIcons';

export function CatalogPageContent() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectionModeActive = searchParams.get('mode') === 'request-selection';
  const selectionRequestId = selectionModeActive ? searchParams.get('requestId') : null;
  const seedDesignId = selectionModeActive ? searchParams.get('seedDesignId') : null;
  const discoveryMode = parseCatalogDiscoveryMode(searchParams.get('discover'));
  const initialSearch = searchParams.get('q') ?? '';
  const initialCategory = searchParams.get('category') ?? '';
  const appliedSeedDesignIdRef = useRef<string | null>(null);

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(initialSearch);
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isTagFilterModalOpen, setIsTagFilterModalOpen] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState<CatalogDesign | null>(null);
  const [selectionActionError, setSelectionActionError] = useState<string | null>(null);
  const [isLeavingSelection, setIsLeavingSelection] = useState(false);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, CATALOG_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [searchQuery]);

  /** Keep library `q` in the URL so designId open/close cannot wipe search. */
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;
  useEffect(() => {
    const params = searchParamsRef.current;
    const urlQ = params.get('q') ?? '';
    const desiredQ = debouncedSearchQuery.trim();
    if (urlQ === desiredQ) {
      return;
    }
    const next = new URLSearchParams(params.toString());
    if (desiredQ) {
      next.set('q', desiredQ);
    } else {
      next.delete('q');
    }
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [debouncedSearchQuery, pathname, router]);

  const {
    actionError: creationActionError,
    continuableRequests,
    createPrintRequest,
    currentRequestAggregates,
    finishCreating,
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
  const { tags: approvedTags, error: approvedTagsError } = useCatalogTags();
  const {
    catalogDesigns,
    designs: displayedDesigns,
    error,
    hasMore,
    isHydrating,
    isCountUnavailable,
    isLoading,
    isLoadingMore,
    loadMoreDesigns,
    matchingCount,
  } = useCatalogDesigns({
    categoryId: categoryFilter || undefined,
    discoveryMode,
    searchQuery: debouncedSearchQuery,
    selectedTags,
  });

  const categoryOptions = useCatalogCategoryOptions(categories);
  const activeCategoryName =
    categories.find((category) => category.id === categoryFilter)?.name ?? null;
  const curatedLibraryView = Boolean(discoveryMode || categoryFilter);

  const hasActiveFilters = Boolean(
    searchQuery.trim() || categoryFilter || selectedTags.length > 0 || discoveryMode,
  );

  const designCountLabel =
    matchingCount === null
      ? isHydrating
        ? 'Counting designs…'
        : isCountUnavailable
          ? 'Count unavailable'
          : '0 designs'
      : `${matchingCount} design${matchingCount === 1 ? '' : 's'}`;

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
    setDebouncedSearchQuery('');
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

  function handleHalftoneFilterChange(halftoneOn: boolean) {
    setSelectedTags((currentTags) => setHalftoneInSelectedTags(currentTags, halftoneOn));
  }

  const visibleTags = useMemo(() => visibleSelectedTags(selectedTags), [selectedTags]);
  const visibleTagCount = countVisibleSelectedTags(selectedTags);
  const halftoneFilterOn = selectedTagsIncludeHalftone(selectedTags);

  const { resetTransientState } = addDesignFlow;

  const libraryParamsWithoutDesignId = useRef<string | null>(null);
  useEffect(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete('designId');
    const fingerprint = next.toString();
    const onlyDesignIdChanged =
      libraryParamsWithoutDesignId.current !== null &&
      libraryParamsWithoutDesignId.current === fingerprint;
    libraryParamsWithoutDesignId.current = fingerprint;

    if (onlyDesignIdChanged) {
      return;
    }

    const nextSearch = searchParams.get('q') ?? '';
    setSearchQuery(nextSearch);
    setDebouncedSearchQuery(nextSearch);
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

    const seededDesign = catalogDesigns.find((design) => design.id === seedDesignId);

    if (!seededDesign) {
      return;
    }

    appliedSeedDesignIdRef.current = seedDesignId;
    addDesignToSelection(seededDesign);
    router.replace(
      buildCatalogSelectionHref(selectionRequestId, {
        from: parsePortalRequestDetailFrom(searchParams.get('from')) ?? 'library',
        seedDesignId,
      }),
    );
  }, [
    addDesignToSelection,
    catalogDesigns,
    router,
    searchParams,
    seedDesignId,
    selectionModeActive,
    selectionRequestId,
  ]);

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
      const returnFrom =
        parsePortalRequestDetailFrom(searchParams.get('from')) ?? 'library';
      router.push(buildRequestDetailHref(selectionRequestId, { from: returnFrom }));
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
      const returnFrom =
        parsePortalRequestDetailFrom(searchParams.get('from')) ?? 'library';
      router.replace(buildRequestDetailHref(selectionRequestId, { from: returnFrom }));
    } catch (saveError) {
      setIsLeavingSelection(false);
      setSelectionActionError(saveError instanceof Error ? saveError.message : 'Unable to save selections.');
    }
  }

  async function handleUploadArtworkFromSelectionMode() {
    if (!selectionRequestId) {
      return;
    }

    setSelectionActionError(null);

    const returnFrom =
      parsePortalRequestDetailFrom(searchParams.get('from')) ?? 'library';
    const uploadHref = buildRequestUploadHref(selectionRequestId, {
      from: returnFrom,
      returnTo: `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`,
    });

    if (!selectionMode.hasPendingChanges) {
      router.push(uploadHref);
      return;
    }

    setIsLeavingSelection(true);

    try {
      await selectionMode.saveSelections({ skipReload: true });
      void refreshRequests({ silent: true });
      router.push(uploadHref);
    } catch (saveError) {
      setIsLeavingSelection(false);
      setSelectionActionError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to save selections before upload.',
      );
    }
  }

  const displayedActionError =
    creationActionError ?? addDesignFlow.actionError ?? selectionActionError ?? deepLinkError;
  // Never keep the creating overlay once selection mode is active (query-param nav keeps this page mounted).
  const pageBusy = !selectionModeActive && isCreating;

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
                    Pick designs from the library below, or upload your own artwork. Set quantities
                    here, then save. On the request page you can set print sizes and add the same
                    design more than once for different sizes.
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
                  Print Request
                </button>
                <button
                  className="portal-button portal-button-secondary portal-button-sm portal-button-leading-icon"
                  disabled={selectionMode.isSaving || isLeavingSelection}
                  onClick={() => void handleUploadArtworkFromSelectionMode()}
                  type="button"
                >
                  <ImagePlusIcon />
                  {selectionMode.isSaving && selectionMode.hasPendingChanges
                    ? 'Saving…'
                    : 'Upload artwork'}
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
              {searchQuery.trim() || categoryFilter || selectedTags.length > 0 ? (
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
              halftoneFilterOn={halftoneFilterOn}
              onCategoryChange={handleCategoryChange}
              onHalftoneFilterChange={handleHalftoneFilterChange}
              onOpenTags={() => setIsTagFilterModalOpen(true)}
              onSearchChange={setSearchQuery}
              searchQuery={searchQuery}
              selectedTagCount={visibleTagCount}
            />
          </div>

          {visibleTags.length > 0 ? (
            <div aria-label="Active tag filters" className="design-library-active-tags">
              <span className="design-library-active-tags-label">Tags:</span>
              {visibleTags.map((tag) => (
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

          {isHydrating ? (
            <p className="portal-muted design-library-search-paging-hint">
              Loading the full catalog for search and filters…
            </p>
          ) : null}
        </div>

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

        <div className="design-library-catalog-scroll">
          {isLoading || (selectionModeActive && selectionMode.isLoading) ? (
            <div className="design-library-loading-state">Loading design library…</div>
          ) : displayedDesigns.length === 0 ? (
            <div className="design-library-empty-state">
              <p className="portal-eyebrow">Design library</p>
              <h3>{hasActiveFilters ? 'No designs found' : 'No designs yet'}</h3>
              <p>
                {hasActiveFilters
                  ? isHydrating
                    ? 'Still loading the catalog — matches may appear in a moment.'
                    : 'Try adjusting your search, category, tag, or discovery filters.'
                  : 'Designs you can use for print requests will appear here.'}
              </p>
            </div>
          ) : (
            <>
              <div className="design-grid" role="list">
                {displayedDesigns.map((design, index) => {
                  const prioritizeLoading = index < CATALOG_FIRST_VIEWPORT_EAGER_COUNT;
                  if (selectionModeActive) {
                    const selection = selectionMode.selectedDesigns[design.id];
                    return (
                      <div key={design.id} role="listitem">
                        <CatalogSelectionCard
                          canAddPrints={addDesignFlow.canAddPrints}
                          design={design}
                          exhaustedHelperText={addDesignFlow.exhaustedHelperText}
                          exhaustedStatusText={addDesignFlow.exhaustedStatusText}
                          hasMatchingDesigns={designHasMatchingDesignsHint(design)}
                          isSelected={Boolean(selection)}
                          onAdd={selectionMode.addDesign}
                          onOpenDetails={openDesignDetails}
                          onQuantityChange={selectionMode.setQuantity}
                          onRemove={(designId) => void selectionMode.removeDesign(designId)}
                          prioritizeLoading={prioritizeLoading}
                          quantity={selection?.quantity ?? 1}
                        />
                      </div>
                    );
                  }

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
                        prioritizeLoading={prioritizeLoading}
                        quantity={quantity > 0 ? quantity : 1}
                      />
                    </div>
                  );
                })}
              </div>

              {hasMore ? (
                <div className="design-library-load-more-row">
                  <button
                    className="portal-button portal-button-secondary"
                    disabled={isLoadingMore}
                    onClick={loadMoreDesigns}
                    type="button"
                  >
                    {isLoadingMore ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>

      <CatalogDesignDetailsModal
        addingDesignId={selectionModeActive ? null : addDesignFlow.addingDesignId}
        canAddPrints={addDesignFlow.canAddPrints}
        currentRequestQuantity={
          selectedDesign === null
            ? 0
            : selectionModeActive
              ? (selectionMode.selectedDesigns[selectedDesign.id]?.quantity ?? 0)
              : (currentRequestAggregates.primaryQuantityByDesignId[selectedDesign.id] ??
                currentRequestAggregates.quantityByDesignId[selectedDesign.id] ??
                0)
        }
        design={selectedDesign}
        exhaustedHelperText={addDesignFlow.exhaustedHelperText}
        exhaustedStatusText={addDesignFlow.exhaustedStatusText}
        isAdding={
          selectedDesign !== null &&
          (selectionModeActive
            ? false
            : addDesignFlow.addingDesignId === selectedDesign.id ||
              addDesignFlow.isEnsuringWorkingRequest)
        }
        isInCurrentRequest={
          selectedDesign !== null &&
          (selectionModeActive
            ? Boolean(selectionMode.selectedDesigns[selectedDesign.id])
            : (currentRequestAggregates.quantityByDesignId[selectedDesign.id] ?? 0) > 0)
        }
        isOpen={selectedDesign !== null}
        onOpenDesign={openDesignDetails}
        onAddToRequest={
          !isAuthenticated
            ? undefined
            : selectionModeActive
              ? (design) => {
                  addDesignToSelection(design);
                }
              : addDesignFlow.addDesign
        }
        onClose={closeDesignDetails}
        onQuantityChange={
          !isAuthenticated
            ? undefined
            : selectionModeActive
              ? selectionMode.setQuantity
              : addDesignFlow.setQuantity
        }
        onRemoveFromRequest={
          !isAuthenticated
            ? undefined
            : selectionModeActive
              ? (designId) => {
                  void selectionMode.removeDesign(designId);
                }
              : addDesignFlow.removeDesign
        }
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

      <CatalogTagFilterModal
        approvedTags={approvedTags}
        catalogSearchQuery={debouncedSearchQuery}
        categoryId={categoryFilter || undefined}
        error={approvedTagsError}
        isOpen={isTagFilterModalOpen}
        onApply={(nextTags) => setSelectedTags(sortCatalogTags(nextTags))}
        onClose={() => setIsTagFilterModalOpen(false)}
        selectedTags={selectedTags}
      />
    </main>
  );
}
