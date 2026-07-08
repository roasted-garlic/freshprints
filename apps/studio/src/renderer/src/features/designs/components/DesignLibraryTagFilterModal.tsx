import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

import { Button } from "../../../shared/components/Button";
import { Checkbox } from "../../../shared/components/Checkbox";
import { ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { TextInput } from "../../../shared/components/TextInput";
import { computeFacetedTagsForDraftSelection, sortTagsAlphabetically } from "../utils/designLibrarySearch";
import type { CatalogTag } from "../types/catalogTag.types";
import type { Design } from "../types/design.types";
import { DesignLibraryModal } from "./DesignLibraryModal";

interface DesignLibraryTagFilterModalProps {
  /** Designs after every non-tag filter (catalog scope, search, category). */
  baseDesigns: Design[];
  catalogTags?: CatalogTag[];
  isOpen: boolean;
  onApply: (selectedTags: string[]) => void;
  onClose: () => void;
  selectedTags: string[];
}

export function DesignLibraryTagFilterModal({
  baseDesigns,
  catalogTags,
  isOpen,
  onApply,
  onClose,
  selectedTags,
}: DesignLibraryTagFilterModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [draftSelectedTags, setDraftSelectedTags] = useState<string[]>(selectedTags);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSearchQuery("");
    setDraftSelectedTags(selectedTags);
  }, [isOpen, selectedTags]);

  // Live faceting: recomputes from the current DRAFT selection on every toggle, so the
  // visible list and counts narrow immediately as the user checks/unchecks tags.
  const facetedTags = useMemo(
    () =>
      computeFacetedTagsForDraftSelection({
        baseDesigns,
        catalogTags,
        draftSelectedTags,
        tagSearchQuery: searchQuery,
      }),
    [baseDesigns, catalogTags, draftSelectedTags, searchQuery],
  );

  // Whether any tags exist at all for the current non-tag filters (ignoring search).
  const hasAnyTags = useMemo(
    () => computeFacetedTagsForDraftSelection({ baseDesigns, catalogTags, draftSelectedTags }).length > 0,
    [baseDesigns, catalogTags, draftSelectedTags],
  );

  const toggleTag = (tag: string) => {
    const isSelected = draftSelectedTags.includes(tag);

    setDraftSelectedTags((currentTags) =>
      isSelected
        ? currentTags.filter((currentTag) => currentTag !== tag)
        : sortTagsAlphabetically([...currentTags, tag]),
    );

    if (!isSelected) {
      // Clear search after selecting so the narrowed list is fully visible for the next pick.
      setSearchQuery("");
    }
  };

  const handleApply = () => {
    onApply(draftSelectedTags);
    onClose();
  };

  const handleClear = () => {
    setDraftSelectedTags([]);
    setSearchQuery("");
  };

  const handleClearSearch = () => {
    setSearchQuery("");

    window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  };

  if (!isOpen) {
    return null;
  }

  const emptyMessage = !hasAnyTags
    ? "No additional matching tags"
    : facetedTags.length === 0
      ? "No tags match your search."
      : null;

  return (
    <DesignLibraryModal
      ariaLabelledBy="design-library-tag-filter-title"
      isOpen={isOpen}
      onClose={onClose}
      shellClassName="design-library-modal-shell-tag-filter"
    >
      <ModalHeader>
        <div>
          <p className="eyebrow">Catalog filters</p>
          <h2 id="design-library-tag-filter-title">Filter by tags</h2>
          <p className="design-library-tag-filter-description">
            Select one or more tags. Designs must include every selected tag, and the list
            narrows to tags that still have matches.
          </p>
        </div>

        <button
          aria-label="Close tag filters"
          className="icon-button icon-button-md icon-button-ghost"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" size={18} strokeWidth={2.2} />
        </button>
      </ModalHeader>

      <ModalBody>
        <TextInput
          label="Search tags"
          name="tagFilterSearch"
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search tags..."
          ref={searchInputRef}
          trailingControl={
            searchQuery ? (
              <button
                aria-label="Clear tag search"
                className="form-input-clear-button"
                onClick={handleClearSearch}
                type="button"
              >
                <X aria-hidden="true" size={16} strokeWidth={2.2} />
              </button>
            ) : null
          }
          value={searchQuery}
        />

        {emptyMessage ? (
          <p className="design-library-tag-filter-empty">{emptyMessage}</p>
        ) : (
          <div className="design-library-tag-filter-list" role="group" aria-label="Tag filters">
            {facetedTags.map((facetedTag) => (
              <Checkbox
                checked={facetedTag.isSelected}
                key={facetedTag.tag}
                label={`${facetedTag.tag} (${facetedTag.count})`}
                name={`tag-${facetedTag.tag}`}
                onChange={() => toggleTag(facetedTag.tag)}
              />
            ))}
          </div>
        )}
      </ModalBody>

      <ModalFooter className="design-details-footer">
        <div className="design-details-footer-start">
          <Button onClick={handleClear} type="button" variant="secondary">
            Clear filters
          </Button>
        </div>
        <div className="design-details-footer-actions">
          <Button onClick={onClose} type="button" variant="secondary">
            Cancel
          </Button>
          <Button onClick={handleApply} type="button" variant="primary">
            Apply tags
            {draftSelectedTags.length > 0 ? ` (${draftSelectedTags.length})` : ""}
          </Button>
        </div>
      </ModalFooter>
    </DesignLibraryModal>
  );
}
