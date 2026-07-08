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
  showArchivedToggle?: boolean;
  onCategoryChange: (value: string) => void;
  onArchivedChange?: (checked: boolean) => void;
  onOpenTags: () => void;
  onSearchChange: (value: string) => void;
  searchQuery: string;
  searchPlaceholder?: string;
  selectedTagCount: number;
}

/**
 * Presentational filter controls (search, category, tags).
 * Renders UI only — all state lives in the page so the fixed dock and URL filters stay in sync.
 */
export function DesignLibraryFilterControls({
  archivedChecked = false,
  categoryFilter,
  categoryOptions,
  showArchivedToggle = false,
  onArchivedChange,
  onCategoryChange,
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
