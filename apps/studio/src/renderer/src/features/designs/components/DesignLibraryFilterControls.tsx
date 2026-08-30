import { ListFilter } from "lucide-react";

import { GlobalSearchField } from "../../../shared/components/GlobalSearchField";
import { Select } from "../../../shared/components/Select";
import { Button } from "../../../shared/components/Button";
import { Toggle } from "../../../shared/components/Toggle";
import type { SelectOption } from "../../../shared/components/Select";

interface DesignLibraryFilterControlsProps {
  archivedChecked?: boolean;
  categoryFilter: string;
  categoryOptions: SelectOption[];
  halftoneFilterOn?: boolean;
  needsCompanionFilterOn?: boolean;
  showArchivedToggle?: boolean;
  onCategoryChange: (value: string) => void;
  onArchivedChange?: (checked: boolean) => void;
  onHalftoneFilterChange?: (on: boolean) => void;
  onNeedsCompanionFilterChange?: (on: boolean) => void;
  onOpenSmartFilters?: () => void;
  onOpenTags: () => void;
  onSearchChange: (value: string) => void;
  searchQuery: string;
  searchPlaceholder?: string;
  selectedSmartFilterCount?: number;
  selectedTagCount: number;
  showSmartFilters?: boolean;
}

/**
 * Presentational filter controls (search, category, tags, optional Smart Filters / Halftone).
 * Renders UI only — all state lives in the page so the fixed dock and URL filters stay in sync.
 */
export function DesignLibraryFilterControls({
  archivedChecked = false,
  categoryFilter,
  categoryOptions,
  halftoneFilterOn = false,
  needsCompanionFilterOn = false,
  showArchivedToggle = false,
  onArchivedChange,
  onCategoryChange,
  onHalftoneFilterChange,
  onNeedsCompanionFilterChange,
  onOpenSmartFilters,
  onOpenTags,
  onSearchChange,
  searchQuery,
  searchPlaceholder = "Search catalog...",
  selectedSmartFilterCount = 0,
  selectedTagCount,
  showSmartFilters = false,
}: DesignLibraryFilterControlsProps) {
  return (
    <div className="design-library-filter-controls">
      <div className="design-library-filter-controls-search">
        <GlobalSearchField
          clearable
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
          value={searchQuery}
        />
      </div>

      <Select
        className="design-library-filter-controls-category"
        label="Category"
        name="designLibraryCategoryFilter"
        onChange={(event) => onCategoryChange(event.target.value)}
        options={categoryOptions}
        value={categoryFilter}
      />

      {onHalftoneFilterChange ? (
        <Toggle
          checked={halftoneFilterOn}
          label="Halftone"
          name="designLibraryHalftoneFilter"
          onChange={onHalftoneFilterChange}
          tone="success"
        />
      ) : null}

      {onNeedsCompanionFilterChange ? (
        <Toggle
          checked={needsCompanionFilterOn}
          label="Needs Companion"
          name="designLibraryNeedsCompanionFilter"
          onChange={onNeedsCompanionFilterChange}
        />
      ) : null}

      <Button className="button-leading-icon" onClick={onOpenTags} size="sm" variant="secondary">
        <ListFilter aria-hidden="true" size={16} strokeWidth={2} />
        Tags
        {selectedTagCount > 0 ? ` (${selectedTagCount})` : ""}
      </Button>

      {showSmartFilters && onOpenSmartFilters ? (
        <Button
          className="button-leading-icon"
          onClick={onOpenSmartFilters}
          size="sm"
          variant="secondary"
        >
          <ListFilter aria-hidden="true" size={16} strokeWidth={2} />
          Smart Filters
          {selectedSmartFilterCount > 0 ? ` (${selectedSmartFilterCount})` : ""}
        </Button>
      ) : null}

      {showArchivedToggle && onArchivedChange ? (
        <Toggle
          checked={archivedChecked}
          label="Archived"
          name="designLibraryArchivedFilter"
          onChange={onArchivedChange}
        />
      ) : null}
    </div>
  );
}
