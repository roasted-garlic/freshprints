'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { CatalogDesignCard } from '../../../features/catalog/components/CatalogDesignCard';
import { CatalogDesignDetailsModal } from '../../../features/catalog/components/CatalogDesignDetailsModal';
import { CatalogFilterBar } from '../../../features/catalog/components/CatalogFilterBar';
import { CatalogSelectionCard } from '../../../features/catalog/components/CatalogSelectionCard';
import { CatalogTagFilterModal } from '../../../features/catalog/components/CatalogTagFilterModal';
import { useCatalogCategories } from '../../../features/catalog/hooks/useCatalogCategories';
import {
  useCatalogCategoryOptions,
  useCatalogDesigns,
  useFilteredCatalogDesigns,
} from '../../../features/catalog/hooks/useCatalogDesigns';
import type { CatalogDesign } from '../../../features/catalog/types/catalog.types';
import {
  filterCatalogDesignsByCategory,
  filterCatalogDesignsBySearch,
  sortCatalogTags,
} from '../../../features/catalog/utils/catalogSearch';
import { catalogStorageService } from '../../../features/catalog/services/catalogStorageService';
import { usePortalPrintRequests } from '../../../features/print-requests/context/PortalPrintRequestContext';
import { usePortalPrintRequestSelectionMode } from '../../../features/print-requests/hooks/usePortalPrintRequestSelectionMode';
import { buildCatalogSelectionHref } from '../../../features/print-requests/utils/catalogSelectionNavigation';
import {
  ArrowLeftIcon,
  ClipboardListIcon,
  PlayCircleIcon,
  PlusCircleIcon,
  SaveIcon,
  XIcon,
} from '../../../features/shared/components/PortalIcons';

export function CatalogPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectionModeActive = searchParams.get('mode') === 'request-selection';
  const selectionRequestId = selectionModeActive ? searchParams.get('requestId') : null;

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isTagFilterModalOpen, setIsTagFilterModalOpen] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState<CatalogDesign | null>(null);
  const [selectionActionError, setSelectionActionError] = useState<string | null>(null);
  const [isLeavingSelection, setIsLeavingSelection] = useState(false);

  const { actionError, continuableRequests, finishCreating, handleStartRequestClick, isCreating, refreshRequests } =
    usePortalPrintRequests();
  const selectionMode = usePortalPrintRequestSelectionMode(selectionRequestId);
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

  const categoryOptions = useCatalogCategoryOptions(categories, designs, selectedTags, searchQuery);

  const hasActiveFilters = Boolean(
    searchQuery.trim() || categoryFilter || selectedTags.length > 0,
  );

  const designCountLabel = `${filteredDesigns.length} design${filteredDesigns.length === 1 ? '' : 's'}`;

  function clearFilters() {
    setSearchQuery('');
    setCategoryFilter('');
    setSelectedTags([]);
  }

  function removeSelectedTag(tagToRemove: string) {
    setSelectedTags((currentTags) => currentTags.filter((tag) => tag !== tagToRemove));
  }

  const hasContinuableRequests = continuableRequests.length > 0;
  const hasSingleContinuableRequest = continuableRequests.length === 1;
  const requestActionLabel = hasContinuableRequests ? 'Continue request' : 'Start request';
  const requestActionPendingLabel = hasContinuableRequests ? 'Continuing…' : 'Starting…';

  useEffect(() => {
    if (!selectionModeActive) {
      return;
    }

    finishCreating();
    void refreshRequests({ silent: true });
  }, [finishCreating, refreshRequests, selectionModeActive]);

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

  function handleExitSelectionMode() {
    if (selectionRequestId) {
      router.push(`/requests/${selectionRequestId}`);
      return;
    }

    router.push('/requests?tab=working');
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

  const displayedActionError = actionError ?? selectionActionError;

  const loadError = error ?? selectionError;

  return (
    <main
      className={`portal-page portal-catalog-page${selectionModeActive ? ' is-selection-mode' : ''}${isCreating ? ' is-creating-request' : ''}${isLeavingSelection ? ' is-leaving-selection' : ''}`}
    >
      {!selectionModeActive ? (
        <header className="portal-catalog-topbar">
          <div className="portal-catalog-topbar-copy">
            <h1>Design Library</h1>
            <p className="portal-muted">Browse designs and create print requests.</p>
          </div>

          <div className="portal-catalog-topbar-actions">
            <Link
              className="portal-button portal-button-secondary portal-button-leading-icon"
              href="/requests?tab=working"
            >
              <ClipboardListIcon />
              My requests
            </Link>
            <button
              className="portal-button portal-button-primary portal-button-leading-icon"
              disabled={isCreating}
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
                  disabled={selectionMode.isSaving || !selectionMode.hasNewSelections}
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
              {hasActiveFilters ? (
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
              onCategoryChange={setCategoryFilter}
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
          ) : filteredDesigns.length === 0 ? (
            <div className="design-library-empty-state">
              <p className="portal-eyebrow">Design library</p>
              <h3>{hasActiveFilters ? 'No designs found' : 'No designs yet'}</h3>
              <p>
                {hasActiveFilters
                  ? 'Try adjusting your search, category, or tag filters.'
                  : 'Designs you can use for print requests will appear here.'}
              </p>
            </div>
          ) : selectionModeActive ? (
            <div className="design-grid" role="list">
              {filteredDesigns.map((design) => {
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
              {filteredDesigns.map((design) => (
                <div key={design.id} role="listitem">
                  <CatalogDesignCard design={design} onSelect={setSelectedDesign} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {!selectionModeActive ? (
        <CatalogDesignDetailsModal
          design={selectedDesign}
          isOpen={selectedDesign !== null}
          onClose={() => setSelectedDesign(null)}
        />
      ) : null}

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
