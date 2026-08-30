'use client';

import { useExplicitContentPreference } from '../hooks/useExplicitContentPreference';
import { FilterIcon, SearchIcon } from '../../shared/components/PortalIcons';
import { PortalSelect } from '../../shared/components/PortalSelect';

interface CatalogFilterBarProps {
  categoryFilter: string;
  categoryOptions: Array<{ value: string; label: string }>;
  filterSheetActiveCount: number;
  halftoneFilterOn: boolean;
  onCategoryChange: (value: string) => void;
  onHalftoneFilterChange: (on: boolean) => void;
  onOpenFiltersSheet: () => void;
  onOpenSmartFilters?: () => void;
  onOpenTags: () => void;
  onSearchChange: (value: string) => void;
  searchQuery: string;
  selectedSmartFilterCount?: number;
  selectedTagCount: number;
  showSmartFilters?: boolean;
}

export function CatalogFilterBar({
  categoryFilter,
  categoryOptions,
  filterSheetActiveCount,
  halftoneFilterOn,
  onCategoryChange,
  onHalftoneFilterChange,
  onOpenFiltersSheet,
  onOpenSmartFilters,
  onOpenTags,
  onSearchChange,
  searchQuery,
  selectedSmartFilterCount = 0,
  selectedTagCount,
  showSmartFilters = false,
}: CatalogFilterBarProps) {
  const { setShowExplicitContent, showExplicitContent } = useExplicitContentPreference();

  return (
    <div className="design-library-filter-controls">
      <div className="design-library-filter-controls-search-row">
        <div className="design-library-filter-controls-search">
          <label className="global-search-field">
            <span className="global-search-icon">
              <SearchIcon />
            </span>
            <input
              className="global-search-input"
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search catalog..."
              type="search"
              value={searchQuery}
            />
          </label>
        </div>

        <button
          aria-label={
            filterSheetActiveCount > 0
              ? `Open filters, ${filterSheetActiveCount} active`
              : 'Open filters'
          }
          className="portal-button portal-button-secondary portal-button-sm portal-button-leading-icon design-library-open-filters-button"
          onClick={onOpenFiltersSheet}
          type="button"
        >
          <FilterIcon />
          <span className="design-library-open-filters-button-label">
            Filters{filterSheetActiveCount > 0 ? ` (${filterSheetActiveCount})` : ''}
          </span>
        </button>
      </div>

      <div className="design-library-filter-controls-secondary">
        <PortalSelect
          className="design-library-filter-controls-category"
          label="Category"
          name="portalCatalogCategoryFilter"
          onChange={onCategoryChange}
          options={categoryOptions}
          value={categoryFilter}
        />

        <label className="design-library-halftone-filter">
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
          className="design-library-explicit-content-filter"
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

        <button
          className="portal-button portal-button-secondary portal-button-sm portal-button-leading-icon design-library-filter-tags-button"
          onClick={onOpenTags}
          type="button"
        >
          <FilterIcon />
          <span className="design-library-filter-tags-button-label">
            Tags{selectedTagCount > 0 ? ` (${selectedTagCount})` : ''}
          </span>
        </button>

        {showSmartFilters && onOpenSmartFilters ? (
          <button
            className="portal-button portal-button-secondary portal-button-sm portal-button-leading-icon design-library-filter-tags-button"
            onClick={onOpenSmartFilters}
            type="button"
          >
            <FilterIcon />
            <span className="design-library-filter-tags-button-label">
              Smart Filters
              {selectedSmartFilterCount > 0 ? ` (${selectedSmartFilterCount})` : ''}
            </span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
