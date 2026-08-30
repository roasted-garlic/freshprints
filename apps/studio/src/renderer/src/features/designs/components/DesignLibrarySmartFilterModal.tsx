import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

import type { PortalCatalogAlgoliaSmartFacetAttribute } from "@fresh-prints/shared/catalog-search/portalCatalogAlgoliaRecord";

import { Button } from "../../../shared/components/Button";
import { Checkbox } from "../../../shared/components/Checkbox";
import { ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { Select } from "../../../shared/components/Select";
import { TextInput } from "../../../shared/components/TextInput";
import {
  studioAlgoliaCatalogSearchService,
  type StudioAlgoliaSmartFacetMap,
  type StudioAlgoliaSmartFilters,
} from "../services/studioAlgoliaCatalogSearchService";
import {
  countStudioAlgoliaSmartFilterSelections,
  emptyStudioAlgoliaSmartFilters,
  normalizeStudioAlgoliaSmartFilterValues,
  STUDIO_SMART_FILTER_DIMENSIONS,
} from "../services/studioAlgoliaSmartFilters";
import { DesignLibraryModal } from "./DesignLibraryModal";

interface DesignLibrarySmartFilterModalProps {
  algoliaFacetContext?: {
    categoryId?: string;
    searchQuery: string;
  } | null;
  isOpen: boolean;
  onApply: (smartFilters: StudioAlgoliaSmartFilters) => void;
  onClose: () => void;
  selectedTags: string[];
  smartFilters: StudioAlgoliaSmartFilters;
}

function cloneSmartFilters(filters: StudioAlgoliaSmartFilters): StudioAlgoliaSmartFilters {
  const next: StudioAlgoliaSmartFilters = {};
  for (const dimension of STUDIO_SMART_FILTER_DIMENSIONS) {
    const values = normalizeStudioAlgoliaSmartFilterValues(filters[dimension.attribute] ?? []);
    if (values.length > 0) {
      next[dimension.attribute] = values;
    }
  }
  return next;
}

export function DesignLibrarySmartFilterModal({
  algoliaFacetContext = null,
  isOpen,
  onApply,
  onClose,
  selectedTags,
  smartFilters,
}: DesignLibrarySmartFilterModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDimension, setActiveDimension] =
    useState<PortalCatalogAlgoliaSmartFacetAttribute>("subjects");
  const [draftFilters, setDraftFilters] = useState<StudioAlgoliaSmartFilters>(() =>
    cloneSmartFilters(smartFilters),
  );
  const [facetMap, setFacetMap] = useState<StudioAlgoliaSmartFacetMap | null>(null);
  const [facetError, setFacetError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const requestGenerationRef = useRef(0);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSearchQuery("");
    setActiveDimension("subjects");
    setDraftFilters(cloneSmartFilters(smartFilters));
  }, [isOpen, smartFilters]);

  useEffect(() => {
    if (!isOpen) {
      setFacetMap(null);
      setFacetError(null);
      setIsLoading(false);
      return;
    }

    if (!studioAlgoliaCatalogSearchService.isConfigured()) {
      setFacetMap(null);
      setFacetError(
        "Catalog search is not configured. Add Studio Algolia search-only environment variables.",
      );
      setIsLoading(false);
      return;
    }

    const generation = ++requestGenerationRef.current;
    let cancelled = false;
    setIsLoading(true);
    setFacetError(null);

    void studioAlgoliaCatalogSearchService
      .listNarrowedSmartFacets({
        categoryId: algoliaFacetContext?.categoryId,
        search: algoliaFacetContext?.searchQuery ?? "",
        selectedTags,
        smartFilters: draftFilters,
      })
      .then((options) => {
        if (cancelled || generation !== requestGenerationRef.current) return;
        setFacetMap(options);
      })
      .catch((loadError) => {
        if (cancelled || generation !== requestGenerationRef.current) return;
        setFacetMap(null);
        setFacetError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load Smart Filter counts. Please try again.",
        );
      })
      .finally(() => {
        if (!cancelled && generation === requestGenerationRef.current) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    algoliaFacetContext?.categoryId,
    algoliaFacetContext?.searchQuery,
    draftFilters,
    isOpen,
    selectedTags,
  ]);

  const dimensionOptions = useMemo(
    () =>
      STUDIO_SMART_FILTER_DIMENSIONS.map((dimension) => {
        const count = (draftFilters[dimension.attribute] ?? []).length;
        return {
          label: count > 0 ? `${dimension.label} (${count})` : dimension.label,
          value: dimension.attribute,
        };
      }),
    [draftFilters],
  );

  const activeOptions = useMemo(() => {
    const options = facetMap?.[activeDimension] ?? [];
    const selected = new Set(
      normalizeStudioAlgoliaSmartFilterValues(draftFilters[activeDimension] ?? []),
    );
    const query = searchQuery.trim().toLowerCase();
    return options
      .filter((option) => !query || option.value.toLowerCase().includes(query))
      .map((option) => ({
        ...option,
        isSelected: selected.has(option.value),
      }));
  }, [activeDimension, draftFilters, facetMap, searchQuery]);

  const hasAnyOptions = useMemo(() => {
    if (facetError) return false;
    if (!facetMap) return isLoading;
    return (facetMap[activeDimension] ?? []).length > 0;
  }, [activeDimension, facetError, facetMap, isLoading]);

  const toggleValue = (value: string) => {
    setDraftFilters((current) => {
      const existing = normalizeStudioAlgoliaSmartFilterValues(current[activeDimension] ?? []);
      const isSelected = existing.includes(value);
      const nextValues = isSelected
        ? existing.filter((entry) => entry !== value)
        : normalizeStudioAlgoliaSmartFilterValues([...existing, value]);
      const next = { ...current };
      if (nextValues.length === 0) {
        delete next[activeDimension];
      } else {
        next[activeDimension] = nextValues;
      }
      return next;
    });

    if (!normalizeStudioAlgoliaSmartFilterValues(draftFilters[activeDimension] ?? []).includes(value)) {
      setSearchQuery("");
    }
  };

  const handleApply = () => {
    onApply(cloneSmartFilters(draftFilters));
    onClose();
  };

  const handleClear = () => {
    setDraftFilters(emptyStudioAlgoliaSmartFilters());
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

  const emptyMessage = facetError
    ? facetError
    : isLoading && !facetMap
      ? "Loading Smart Filter counts…"
      : !hasAnyOptions
        ? "No matching filters"
        : activeOptions.length === 0
          ? "No filters match your search."
          : null;

  const visibleDraftCount = countStudioAlgoliaSmartFilterSelections(draftFilters);
  const activeLabel =
    STUDIO_SMART_FILTER_DIMENSIONS.find((dimension) => dimension.attribute === activeDimension)
      ?.label ?? "Smart Filters";

  return (
    <DesignLibraryModal
      ariaLabelledBy="design-library-smart-filter-title"
      isOpen={isOpen}
      onClose={onClose}
      shellClassName="design-library-modal-shell-tag-filter"
    >
      <ModalHeader>
        <div>
          <p className="eyebrow">Catalog filters</p>
          <h2 id="design-library-smart-filter-title">Smart Filters</h2>
          <p className="design-library-tag-filter-description">
            Select one or more values per dimension. Designs must match every selected filter,
            together with tags, category, and search.
          </p>
        </div>

        <button
          aria-label="Close Smart Filters"
          className="icon-button icon-button-md icon-button-ghost"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" size={18} strokeWidth={2.2} />
        </button>
      </ModalHeader>

      <ModalBody>
        <Select
          label="Dimension"
          name="smartFilterDimension"
          onChange={(event) =>
            setActiveDimension(event.target.value as PortalCatalogAlgoliaSmartFacetAttribute)
          }
          options={dimensionOptions}
          value={activeDimension}
        />

        <TextInput
          label={`Search ${activeLabel.toLowerCase()}`}
          name="smartFilterSearch"
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={`Search ${activeLabel.toLowerCase()}...`}
          ref={searchInputRef}
          trailingControl={
            searchQuery ? (
              <button
                aria-label="Clear Smart Filter search"
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
          <div
            className="design-library-tag-filter-list"
            role="group"
            aria-label={`${activeLabel} filters`}
          >
            {activeOptions.map((option) => (
              <Checkbox
                checked={option.isSelected}
                key={option.value}
                label={`${option.value} (${option.count})`}
                name={`smart-${activeDimension}-${option.value}`}
                onChange={() => toggleValue(option.value)}
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
        <div aria-hidden="true" className="design-details-footer-center" />
        <div className="design-details-footer-actions">
          <Button onClick={onClose} type="button" variant="secondary">
            Cancel
          </Button>
          <Button onClick={handleApply} type="button" variant="primary">
            Apply filters
            {visibleDraftCount > 0 ? ` (${visibleDraftCount})` : ""}
          </Button>
        </div>
      </ModalFooter>
    </DesignLibraryModal>
  );
}
