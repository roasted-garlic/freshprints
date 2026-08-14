import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

import { Button } from "../../../shared/components/Button";
import { Checkbox } from "../../../shared/components/Checkbox";
import { ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { TextInput } from "../../../shared/components/TextInput";
import {
  buildFacetedTagsFromAlgoliaOptions,
  computeFacetedTagsForDraftSelection,
  countVisibleSelectedTags,
  sortTagsAlphabetically,
  type FacetedTag,
} from "../utils/designLibrarySearch";
import type { CatalogTag } from "../types/catalogTag.types";
import type { Design } from "../types/design.types";
import {
  studioAlgoliaCatalogSearchService,
  type StudioAlgoliaTagFacetOption,
} from "../services/studioAlgoliaCatalogSearchService";
import { DesignLibraryModal } from "./DesignLibraryModal";

interface DesignLibraryTagFilterModalProps {
  /** Designs after every non-tag filter (catalog scope, search, category). Used when Algolia facets are off. */
  baseDesigns: Design[];
  catalogTags?: CatalogTag[];
  /** Ready-catalog managed facet context (search + category). Tag draft narrows live. */
  algoliaFacetContext?: {
    categoryId?: string;
    searchQuery: string;
  } | null;
  isOpen: boolean;
  onApply: (selectedTags: string[]) => void;
  onClose: () => void;
  selectedTags: string[];
  /** When true, counts come from Algolia `tagFacetKeys` (complete ready scope). */
  useAlgoliaFacets?: boolean;
}

export function DesignLibraryTagFilterModal({
  baseDesigns,
  catalogTags,
  algoliaFacetContext = null,
  isOpen,
  onApply,
  onClose,
  selectedTags,
  useAlgoliaFacets = false,
}: DesignLibraryTagFilterModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [draftSelectedTags, setDraftSelectedTags] = useState<string[]>(selectedTags);
  const [algoliaOptions, setAlgoliaOptions] = useState<StudioAlgoliaTagFacetOption[] | null>(null);
  const [algoliaError, setAlgoliaError] = useState<string | null>(null);
  const [isAlgoliaLoading, setIsAlgoliaLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const requestGenerationRef = useRef(0);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSearchQuery("");
    setDraftSelectedTags(selectedTags);
  }, [isOpen, selectedTags]);

  useEffect(() => {
    if (!isOpen || !useAlgoliaFacets) {
      setAlgoliaOptions(null);
      setAlgoliaError(null);
      setIsAlgoliaLoading(false);
      return;
    }

    if (!studioAlgoliaCatalogSearchService.isConfigured()) {
      setAlgoliaOptions(null);
      setAlgoliaError(
        "Catalog search is not configured. Add Studio Algolia search-only environment variables.",
      );
      setIsAlgoliaLoading(false);
      return;
    }

    const generation = ++requestGenerationRef.current;
    let cancelled = false;
    setIsAlgoliaLoading(true);
    setAlgoliaError(null);

    void studioAlgoliaCatalogSearchService
      .listNarrowedTagFacets({
        categoryId: algoliaFacetContext?.categoryId,
        search: algoliaFacetContext?.searchQuery ?? "",
        selectedTags: draftSelectedTags,
      })
      .then((options) => {
        if (cancelled || generation !== requestGenerationRef.current) return;
        setAlgoliaOptions(options);
      })
      .catch((loadError) => {
        if (cancelled || generation !== requestGenerationRef.current) return;
        setAlgoliaOptions(null);
        setAlgoliaError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load catalog tag counts. Please try again.",
        );
      })
      .finally(() => {
        if (!cancelled && generation === requestGenerationRef.current) {
          setIsAlgoliaLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    algoliaFacetContext?.categoryId,
    algoliaFacetContext?.searchQuery,
    draftSelectedTags,
    isOpen,
    useAlgoliaFacets,
  ]);

  const clientFacetedTags = useMemo(
    () =>
      computeFacetedTagsForDraftSelection({
        baseDesigns,
        catalogTags,
        draftSelectedTags,
        tagSearchQuery: searchQuery,
      }),
    [baseDesigns, catalogTags, draftSelectedTags, searchQuery],
  );

  const algoliaFacetedTags = useMemo((): FacetedTag[] => {
    if (!algoliaOptions) {
      return [];
    }
    return buildFacetedTagsFromAlgoliaOptions({
      catalogTags,
      draftSelectedTags,
      facetOptions: algoliaOptions,
      tagSearchQuery: searchQuery,
    });
  }, [algoliaOptions, catalogTags, draftSelectedTags, searchQuery]);

  const facetedTags = useAlgoliaFacets ? algoliaFacetedTags : clientFacetedTags;

  const hasAnyTags = useMemo(() => {
    if (useAlgoliaFacets) {
      if (algoliaError) return false;
      if (!algoliaOptions) return isAlgoliaLoading;
      return (
        buildFacetedTagsFromAlgoliaOptions({
          catalogTags,
          draftSelectedTags,
          facetOptions: algoliaOptions,
        }).length > 0
      );
    }
    return (
      computeFacetedTagsForDraftSelection({ baseDesigns, catalogTags, draftSelectedTags }).length >
      0
    );
  }, [
    algoliaError,
    algoliaOptions,
    baseDesigns,
    catalogTags,
    draftSelectedTags,
    isAlgoliaLoading,
    useAlgoliaFacets,
  ]);

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

  const emptyMessage = algoliaError
    ? algoliaError
    : isAlgoliaLoading && useAlgoliaFacets && !algoliaOptions
      ? "Loading tag counts…"
      : !hasAnyTags
        ? "No additional matching tags"
        : facetedTags.length === 0
          ? "No tags match your search."
          : null;

  const visibleDraftTagCount = countVisibleSelectedTags(draftSelectedTags);

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
        {/* Spacer so Cancel/Apply land in the right grid column (shared 3-col footer). */}
        <div aria-hidden="true" className="design-details-footer-center" />
        <div className="design-details-footer-actions">
          <Button onClick={onClose} type="button" variant="secondary">
            Cancel
          </Button>
          <Button onClick={handleApply} type="button" variant="primary">
            Apply tags
            {visibleDraftTagCount > 0 ? ` (${visibleDraftTagCount})` : ""}
          </Button>
        </div>
      </ModalFooter>
    </DesignLibraryModal>
  );
}
