'use client';

import { FilterIcon, SearchIcon } from '../../shared/components/PortalIcons';
import { PortalSelect } from '../../shared/components/PortalSelect';

interface CatalogFilterBarProps {
  categoryFilter: string;
  categoryOptions: Array<{ value: string; label: string }>;
  onCategoryChange: (value: string) => void;
  onOpenTags: () => void;
  onSearchChange: (value: string) => void;
  searchQuery: string;
  selectedTagCount: number;
}

export function CatalogFilterBar({
  categoryFilter,
  categoryOptions,
  onCategoryChange,
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
