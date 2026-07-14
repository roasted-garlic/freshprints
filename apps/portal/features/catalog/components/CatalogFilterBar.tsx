'use client';

import { FilterIcon, SearchIcon } from '../../shared/components/PortalIcons';
import { PortalSelect } from '../../shared/components/PortalSelect';

interface CatalogFilterBarProps {
  categoryFilter: string;
  categoryOptions: Array<{ value: string; label: string }>;
  halftoneFilterOn: boolean;
  onCategoryChange: (value: string) => void;
  onHalftoneFilterChange: (on: boolean) => void;
  onOpenTags: () => void;
  onSearchChange: (value: string) => void;
  searchQuery: string;
  selectedTagCount: number;
}

export function CatalogFilterBar({
  categoryFilter,
  categoryOptions,
  halftoneFilterOn,
  onCategoryChange,
  onHalftoneFilterChange,
  onOpenTags,
  onSearchChange,
  searchQuery,
  selectedTagCount,
}: CatalogFilterBarProps) {
  return (
    <div className="design-library-filter-controls">
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
      </div>
    </div>
  );
}
