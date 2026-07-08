'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

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
import { useMyPrintRequests } from '../../../features/print-requests/hooks/useMyPrintRequests';
import { usePortalPrintRequestSelectionMode } from '../../../features/print-requests/hooks/usePortalPrintRequestSelectionMode';

function CloseIcon() {
  return (
    <svg aria-hidden="true" height="12" viewBox="0 0 24 24" width="12">
      <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.25" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg aria-hidden="true" height="16" viewBox="0 0 24 24" width="16">
      <path
        d="M19 12H5M12 19l-7-7 7-7"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg aria-hidden="true" height="16" viewBox="0 0 24 24" width="16">
      <path
        d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M17 21v-8H7v8M7 3v5h8"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

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
  const [isCreatingRequest, setIsCreatingRequest] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { continuableRequests, createPrintRequest } = useMyPrintRequests();
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

  async function handleRequestAction() {
    setActionError(null);

    if (hasSingleContinuableRequest) {
      router.push(`/requests/${continuableRequests[0].id}`);
      return;
    }

    if (hasContinuableRequests) {
      router.push('/requests?tab=working');
      return;
    }

    setIsCreatingRequest(true);

    try {
      const created = await createPrintRequest();
      router.push(`/catalog?mode=request-selection&requestId=${created.printRequestId}`);
    } catch (createError) {
      setActionError(createError instanceof Error ? createError.message : 'Unable to create print request.');
    } finally {
      setIsCreatingRequest(false);
    }
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

    setActionError(null);

    try {
      await selectionMode.saveSelections();
      router.push(`/requests/${selectionRequestId}`);
    } catch (saveError) {
      setActionError(saveError instanceof Error ? saveError.message : 'Unable to save selections.');
    }
  }

  const loadError = error ?? selectionError;

  return (
    <main className={`portal-page portal-catalog-page${selectionModeActive ? ' is-selection-mode' : ''}`}>
      <header className="portal-catalog-topbar">
        <div className="portal-catalog-topbar-copy">
          <h1>{selectionModeActive ? 'Add designs to request' : 'Design Library'}</h1>
          <p className="portal-muted">
            {selectionModeActive
              ? 'Select designs, set quantities, and save them to your print request.'
              : 'Browse designs and create print requests.'}
          </p>
        </div>

        {!selectionModeActive ? (
          <div className="portal-catalog-topbar-actions">
            <Link className="portal-button portal-button-secondary" href="/requests?tab=working">
              My requests
            </Link>
            <button
              className="portal-button portal-button-primary"
              disabled={isCreatingRequest}
              onClick={() => void handleRequestAction()}
              type="button"
            >
              {isCreatingRequest ? requestActionPendingLabel : requestActionLabel}
            </button>
          </div>
        ) : null}
      </header>

      {loadError ? (
        <p className="portal-error" role="alert">
          {loadError}
        </p>
      ) : null}

      {actionError ? (
        <p className="portal-error" role="alert">
          {actionError}
        </p>
      ) : null}

      <section className="design-library-section">
        <div className="design-library-fixed-region">
          {selectionModeActive && selectionMode.printRequest ? (
            <div className="design-library-selection-tray">
              <div className="design-library-selection-tray-top">
                <div className="design-library-selection-tray-copy">
                  <p className="portal-eyebrow">Selection mode</p>
                  <h3>{selectionMode.printRequest.name}</h3>
                  <p>
                    Select designs, set quantities, and save the chosen items back to this print request.
                  </p>
                </div>
              </div>

              <div className="design-library-selection-tray-bottom">
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
                    className="portal-button portal-button-secondary portal-button-leading-icon"
                    onClick={handleExitSelectionMode}
                    type="button"
                  >
                    <ArrowLeftIcon />
                    Back to request
                  </button>
                  <button
                    className="portal-button portal-button-primary portal-button-leading-icon"
                    disabled={selectionMode.isSaving || !selectionMode.hasNewSelections}
                    onClick={() => void handleSaveSelectionMode()}
                    type="button"
                  >
                    <SaveIcon />
                    {selectionMode.isSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="design-library-filter-dock">
            <div className="design-library-summary-row">
              <span className="design-library-count-chip">{designCountLabel}</span>
              {hasActiveFilters ? (
                <button className="portal-button portal-button-secondary portal-button-sm" onClick={clearFilters} type="button">
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
                    <CloseIcon />
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
