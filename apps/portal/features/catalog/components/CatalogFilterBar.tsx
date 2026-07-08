'use client';

import { FilterIcon, SearchIcon } from '../../shared/components/PortalIcons';

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

      <select
        aria-label="Category"
        className="design-library-filter-select"
        onChange={(event) => onCategoryChange(event.target.value)}
        value={categoryFilter}
      >
        {categoryOptions.map((option) => (
          <option key={option.value || 'all'} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <button
        className="portal-button portal-button-secondary portal-button-sm portal-button-leading-icon"
        onClick={onOpenTags}
        type="button"
      >
        <FilterIcon />
        Tags{selectedTagCount > 0 ? ` (${selectedTagCount})` : ''}
      </button>
    </div>
  );
}
