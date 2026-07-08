'use client';

interface CatalogFilterBarProps {
  categoryFilter: string;
  categoryOptions: Array<{ value: string; label: string }>;
  onCategoryChange: (value: string) => void;
  onOpenTags: () => void;
  onSearchChange: (value: string) => void;
  searchQuery: string;
  selectedTagCount: number;
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="global-search-icon" height="16" viewBox="0 0 24 24" width="16">
      <path
        d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Zm8.1 2.1-4.2-4.2"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg aria-hidden="true" height="16" viewBox="0 0 24 24" width="16">
      <path
        d="M4 6h16M7 12h10M10 18h4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
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
          <SearchIcon />
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

      <button className="portal-button portal-button-secondary portal-button-sm" onClick={onOpenTags} type="button">
        <FilterIcon />
        Tags{selectedTagCount > 0 ? ` (${selectedTagCount})` : ''}
      </button>
    </div>
  );
}
