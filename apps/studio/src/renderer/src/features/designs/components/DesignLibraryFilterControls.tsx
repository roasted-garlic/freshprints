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
  showArchivedToggle?: boolean;
  onCategoryChange: (value: string) => void;
  onArchivedChange?: (checked: boolean) => void;
  onHalftoneFilterChange?: (on: boolean) => void;
  onOpenTags: () => void;
  onSearchChange: (value: string) => void;
  searchQuery: string;
  searchPlaceholder?: string;
  selectedTagCount: number;
}

/**
 * Presentational filter controls (search, category, tags, optional Halftone).
 * Renders UI only — all state lives in the page so the fixed dock and URL filters stay in sync.
 */
export function DesignLibraryFilterControls({
  archivedChecked = false,
  categoryFilter,
  categoryOptions,
  halftoneFilterOn = false,
  showArchivedToggle = false,
  onArchivedChange,
  onCategoryChange,
  onHalftoneFilterChange,
  onOpenTags,
  onSearchChange,
  searchQuery,
  searchPlaceholder = "Search catalog...",
  selectedTagCount,
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

      <Button className="button-leading-icon" onClick={onOpenTags} size="sm" variant="secondary">
        <ListFilter aria-hidden="true" size={16} strokeWidth={2} />
        Tags
        {selectedTagCount > 0 ? ` (${selectedTagCount})` : ""}
      </Button>

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
