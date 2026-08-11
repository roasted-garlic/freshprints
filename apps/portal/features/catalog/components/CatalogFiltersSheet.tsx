'use client';

import { useEffect, useState } from 'react';
import { useExplicitContentPreference } from '../hooks/useExplicitContentPreference';
import { CheckIcon, FilterIcon, XIcon } from '../../shared/components/PortalIcons';

interface CatalogFiltersSheetProps {
  categoryFilter: string;
  categoryOptions: Array<{ value: string; label: string }>;
  halftoneFilterOn: boolean;
  isOpen: boolean;
  onCategoryChange: (value: string) => void;
  onClose: () => void;
  onHalftoneFilterChange: (on: boolean) => void;
  onOpenTags: () => void;
  selectedTagCount: number;
}

/**
 * Mobile bottom sheet for catalog secondary filters.
 * Category starts collapsed; expanding reveals an in-sheet list so options never clip under Done.
 */
export function CatalogFiltersSheet({
  categoryFilter,
  categoryOptions,
  halftoneFilterOn,
  isOpen,
  onCategoryChange,
  onClose,
  onHalftoneFilterChange,
  onOpenTags,
  selectedTagCount,
}: CatalogFiltersSheetProps) {
  const { setShowExplicitContent, showExplicitContent } = useExplicitContentPreference();
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsCategoryOpen(false);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const selectedCategoryLabel =
    categoryOptions.find((option) => option.value === categoryFilter)?.label ?? 'All categories';

  return (
    <div
      aria-labelledby="catalog-filters-sheet-title"
      aria-modal="true"
      className="modal-overlay modal-overlay-blur tag-filter-overlay catalog-filters-sheet-overlay"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="modal-panel modal-panel-tag-filter tag-filter-drawer catalog-filters-sheet"
        onClick={(event) => event.stopPropagation()}
      >
        <div aria-hidden="true" className="tag-filter-drawer-handle" />
        <header className="modal-header">
          <div>
            <h2 id="catalog-filters-sheet-title">Filters</h2>
            <p className="design-library-tag-filter-description">
              Narrow the catalog, then tap Done.
            </p>
          </div>
          <button
            aria-label="Close filters"
            className="modal-close-button"
            onClick={onClose}
            type="button"
          >
            <XIcon />
          </button>
        </header>

        <div className="modal-body catalog-filters-sheet-body">
          <section aria-labelledby="catalog-filters-category-heading" className="catalog-filters-sheet-section">
            <h3 className="catalog-filters-sheet-section-title" id="catalog-filters-category-heading">
              Category
            </h3>
            <button
              aria-controls="catalog-filters-category-list"
              aria-expanded={isCategoryOpen}
              className={`catalog-filters-category-trigger${isCategoryOpen ? ' is-open' : ''}`}
              onClick={() => setIsCategoryOpen((open) => !open)}
              type="button"
            >
              <span className="catalog-filters-category-trigger-value">{selectedCategoryLabel}</span>
              <span aria-hidden="true" className="portal-select-chevron catalog-filters-category-chevron">
                ▾
              </span>
            </button>
            {isCategoryOpen ? (
              <div
                aria-label="Category"
                className="catalog-filters-category-list"
                id="catalog-filters-category-list"
                role="listbox"
              >
                {categoryOptions.map((option) => {
                  const isSelected = option.value === categoryFilter;
                  return (
                    <button
                      aria-selected={isSelected}
                      className={`catalog-filters-category-option${isSelected ? ' is-selected' : ''}`}
                      key={option.value || 'all'}
                      onClick={() => {
                        onCategoryChange(option.value);
                        setIsCategoryOpen(false);
                      }}
                      role="option"
                      type="button"
                    >
                      <span className="catalog-filters-category-option-label">{option.label}</span>
                      {isSelected ? (
                        <span aria-hidden="true" className="catalog-filters-category-option-check">
                          <CheckIcon size={16} />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </section>

          <section aria-labelledby="catalog-filters-discovery-heading" className="catalog-filters-sheet-section">
            <h3 className="catalog-filters-sheet-section-title" id="catalog-filters-discovery-heading">
              Discovery
            </h3>
            <div className="catalog-filters-sheet-toggles">
              <label className="design-library-halftone-filter catalog-filters-sheet-toggle">
                <input
                  aria-checked={halftoneFilterOn}
                  checked={halftoneFilterOn}
                  className="design-library-halftone-filter-input"
                  onChange={(event) => onHalftoneFilterChange(event.target.checked)}
                  role="switch"
                  type="checkbox"
                />
                <span className="design-library-halftone-filter-track" aria-hidden="true">
                  <span className="design-library-halftone-filter-thumb" />
                </span>
                <span className="design-library-halftone-filter-label">Halftone</span>
              </label>

              <label
                className="design-library-explicit-content-filter catalog-filters-sheet-toggle"
                title={showExplicitContent ? 'Hide censored content' : 'Show censored content'}
              >
                <input
                  aria-checked={showExplicitContent}
                  aria-label={showExplicitContent ? 'Hide censored content' : 'Show censored content'}
                  checked={showExplicitContent}
                  className="design-library-explicit-content-filter-input"
                  onChange={(event) => setShowExplicitContent(event.target.checked)}
                  role="switch"
                  type="checkbox"
                />
                <span className="design-library-explicit-content-filter-track" aria-hidden="true">
                  <span className="design-library-explicit-content-filter-thumb" />
                </span>
                <span aria-hidden="true" className="design-library-explicit-content-filter-label">
                  {showExplicitContent ? 'Uncensored' : 'Censored'}
                </span>
              </label>
            </div>
          </section>

          <section aria-labelledby="catalog-filters-tags-heading" className="catalog-filters-sheet-section">
            <h3 className="catalog-filters-sheet-section-title" id="catalog-filters-tags-heading">
              Tags
            </h3>
            <button
              className="portal-button portal-button-secondary portal-button-leading-icon catalog-filters-tags-button"
              onClick={onOpenTags}
              type="button"
            >
              <FilterIcon />
              <span>
                {selectedTagCount > 0
                  ? `Choose tags (${selectedTagCount} selected)`
                  : 'Choose tags'}
              </span>
            </button>
          </section>
        </div>

        <footer className="modal-footer modal-footer-tag-filter catalog-filters-sheet-footer">
          <button className="portal-button portal-button-primary" onClick={onClose} type="button">
            Done
          </button>
        </footer>
      </div>
    </div>
  );
}
