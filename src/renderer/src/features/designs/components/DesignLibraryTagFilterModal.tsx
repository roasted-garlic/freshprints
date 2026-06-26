import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

import { Button } from "../../../shared/components/Button";
import { Checkbox } from "../../../shared/components/Checkbox";
import { ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { TextInput } from "../../../shared/components/TextInput";
import { filterTagsBySearch, sortTagsAlphabetically } from "../utils/designLibrarySearch";
import { DesignLibraryModal } from "./DesignLibraryModal";

interface DesignLibraryTagFilterModalProps {
  availableTags: string[];
  isOpen: boolean;
  onApply: (selectedTags: string[]) => void;
  onClose: () => void;
  selectedTags: string[];
}

export function DesignLibraryTagFilterModal({
  availableTags,
  isOpen,
  onApply,
  onClose,
  selectedTags,
}: DesignLibraryTagFilterModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [draftSelectedTags, setDraftSelectedTags] = useState<string[]>(selectedTags);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSearchQuery("");
    setDraftSelectedTags(selectedTags);
  }, [isOpen, selectedTags]);

  const visibleTags = useMemo(() => {
    const mergedTags = sortTagsAlphabetically([
      ...new Set([...availableTags, ...draftSelectedTags]),
    ]);

    return filterTagsBySearch(mergedTags, searchQuery);
  }, [availableTags, draftSelectedTags, searchQuery]);

  const toggleTag = (tag: string) => {
    const isSelected = draftSelectedTags.includes(tag);

    setDraftSelectedTags((currentTags) =>
      isSelected
        ? currentTags.filter((currentTag) => currentTag !== tag)
        : sortTagsAlphabetically([...currentTags, tag]),
    );

    if (!isSelected) {
      // Clear search after selecting a tag so the full list is visible for the next pick.
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
  };

  if (!isOpen) {
    return null;
  }

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
            Select one or more tags. Designs must include every selected tag.
          </p>
        </div>
      </ModalHeader>

      <ModalBody>
        <TextInput
          label="Search tags"
          name="tagFilterSearch"
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search tags..."
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

        {visibleTags.length === 0 ? (
          <p className="design-library-tag-filter-empty">No tags match your search.</p>
        ) : (
          <div className="design-library-tag-filter-list" role="group" aria-label="Tag filters">
            {visibleTags.map((tag) => (
              <Checkbox
                checked={draftSelectedTags.includes(tag)}
                key={tag}
                label={tag}
                name={`tag-${tag}`}
                onChange={() => toggleTag(tag)}
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
