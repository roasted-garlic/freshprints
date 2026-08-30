'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { CheckIcon, XIcon } from '../../shared/components/PortalIcons';
import {
  SMART_FACET_ATTRIBUTES,
  countSelectedSmartFilters,
  portalAlgoliaCatalogSearchService,
  type PortalSmartFacetDistributions,
  type PortalSmartFilters,
  type SmartFacetAttr,
} from '../services/portalAlgoliaCatalogSearchService';

/** Default visible values per dimension before typeahead expands the list. */
export const SMART_FACET_TOP_N = 40;

export const SMART_FACET_LABELS: Record<SmartFacetAttr, string> = {
  subjects: 'Subjects',
  styles: 'Styles',
  themes: 'Themes',
  interests: 'Interests',
  professionsGroups: 'Professions / Groups',
  occasions: 'Occasions',
  places: 'Places',
  colors: 'Colors',
};

interface CatalogSmartFilterModalProps {
  /** Applied catalog free-text query (debounced) — refines Algolia facet counts. */
  catalogSearchQuery?: string;
  /** Active catalog category filter — refines Algolia facet counts when set. */
  categoryId?: string;
  isOpen: boolean;
  onApply: (smartFilters: PortalSmartFilters) => void;
  onClose: () => void;
  /** Active legacy tag filters — refine Smart facet counts under the same AND context. */
  selectedTags?: string[];
  smartFilters: PortalSmartFilters;
}

function emptySmartFilters(): PortalSmartFilters {
  return {};
}

function cloneSmartFilters(filters: PortalSmartFilters): PortalSmartFilters {
  const next: PortalSmartFilters = {};
  for (const attr of SMART_FACET_ATTRIBUTES) {
    const values = filters[attr];
    if (values?.length) {
      next[attr] = [...values];
    }
  }
  return next;
}

function normalizeDraftValues(values: string[] | undefined): string[] {
  return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right),
  );
}

/**
 * Top-N by count when not searching; typeahead reveals more matches.
 * Always keeps currently selected values visible for the active dimension.
 */
export function buildSmartFacetDisplayOptions(args: {
  distribution: Array<{ value: string; count: number }>;
  searchQuery: string;
  selectedValues: string[];
  topN?: number;
}): Array<{ value: string; count: number; isSelected: boolean }> {
  const topN = args.topN ?? SMART_FACET_TOP_N;
  const selected = new Set(normalizeDraftValues(args.selectedValues));
  const q = args.searchQuery.trim().toLowerCase();
  const byValue = new Map(args.distribution.map((entry) => [entry.value, entry.count]));

  let candidates: Array<{ value: string; count: number }>;
  if (q) {
    candidates = args.distribution.filter((entry) => entry.value.toLowerCase().includes(q));
    for (const value of selected) {
      if (!candidates.some((entry) => entry.value === value) && value.toLowerCase().includes(q)) {
        candidates.push({ value, count: byValue.get(value) ?? 0 });
      }
    }
    candidates.sort(
      (left, right) => right.count - left.count || left.value.localeCompare(right.value),
    );
  } else {
    const byCount = [...args.distribution].sort(
      (left, right) => right.count - left.count || left.value.localeCompare(right.value),
    );
    candidates = byCount.slice(0, topN);
    const visible = new Set(candidates.map((entry) => entry.value));
    for (const value of selected) {
      if (!visible.has(value)) {
        candidates.push({ value, count: byValue.get(value) ?? 0 });
        visible.add(value);
      }
    }
    candidates.sort(
      (left, right) => right.count - left.count || left.value.localeCompare(right.value),
    );
  }

  return candidates.map((entry) => ({
    ...entry,
    isSelected: selected.has(entry.value),
  }));
}

export function CatalogSmartFilterModal({
  catalogSearchQuery = '',
  categoryId = '',
  isOpen,
  onApply,
  onClose,
  selectedTags = [],
  smartFilters,
}: CatalogSmartFilterModalProps) {
  const [activeAttr, setActiveAttr] = useState<SmartFacetAttr>('subjects');
  const [searchQuery, setSearchQuery] = useState('');
  const [draftFilters, setDraftFilters] = useState<PortalSmartFilters>(() =>
    cloneSmartFilters(smartFilters),
  );
  const [distributions, setDistributions] = useState<PortalSmartFacetDistributions | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadGenerationRef = useRef(0);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setSearchQuery('');
    setActiveAttr('subjects');
    setDraftFilters(cloneSmartFilters(smartFilters));
  }, [isOpen, smartFilters]);

  const draftKey = useMemo(() => {
    return SMART_FACET_ATTRIBUTES.map((attr) => {
      const values = normalizeDraftValues(draftFilters[attr]);
      return values.length > 0 ? `${attr}=${values.join('\u0001')}` : '';
    })
      .filter(Boolean)
      .join('\u0000');
  }, [draftFilters]);

  const appliedCatalogSearch = catalogSearchQuery.trim();
  const appliedCategoryId = categoryId.trim();
  const selectedTagsKey = useMemo(
    () => [...selectedTags].map((tag) => tag.trim()).filter(Boolean).sort().join('\0'),
    [selectedTags],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isCancelled = false;
    const generation = ++loadGenerationRef.current;
    const tags = selectedTagsKey ? selectedTagsKey.split('\0') : [];
    const draft: PortalSmartFilters = {};
    if (draftKey) {
      for (const part of draftKey.split('\u0000')) {
        const eq = part.indexOf('=');
        if (eq <= 0) continue;
        const attr = part.slice(0, eq) as SmartFacetAttr;
        const values = part.slice(eq + 1).split('\u0001').filter(Boolean);
        if (SMART_FACET_ATTRIBUTES.includes(attr) && values.length > 0) {
          draft[attr] = values;
        }
      }
    }

    setDistributions(null);
    setLoadError(null);

    void portalAlgoliaCatalogSearchService
      .listSmartFacetDistributions({
        search: appliedCatalogSearch || undefined,
        categoryId: appliedCategoryId || undefined,
        selectedTags: tags,
        smartFilters: draft,
      })
      .then((result) => {
        if (isCancelled || generation !== loadGenerationRef.current) return;
        setDistributions(result);
      })
      .catch((error: unknown) => {
        if (isCancelled || generation !== loadGenerationRef.current) return;
        setLoadError(
          error instanceof Error ? error.message : 'Unable to load smart filters.',
        );
        setDistributions(null);
      });

    return () => {
      isCancelled = true;
    };
  }, [appliedCatalogSearch, appliedCategoryId, draftKey, isOpen, selectedTagsKey]);

  const activeDistribution = useMemo(
    () => distributions?.[activeAttr] ?? [],
    [distributions, activeAttr],
  );
  const activeSelected = normalizeDraftValues(draftFilters[activeAttr]);
  const displayOptions = useMemo(
    () =>
      buildSmartFacetDisplayOptions({
        distribution: activeDistribution,
        searchQuery,
        selectedValues: activeSelected,
      }),
    [activeDistribution, activeSelected, searchQuery],
  );

  const isLoading = isOpen && distributions === null && !loadError;
  const visibleDraftCount = countSelectedSmartFilters(draftFilters);

  if (!isOpen) {
    return null;
  }

  function toggleValue(attr: SmartFacetAttr, value: string) {
    setDraftFilters((current) => {
      const existing = normalizeDraftValues(current[attr]);
      const nextValues = existing.includes(value)
        ? existing.filter((entry) => entry !== value)
        : [...existing, value].sort((left, right) => left.localeCompare(right));
      const next = { ...current };
      if (nextValues.length === 0) {
        delete next[attr];
      } else {
        next[attr] = nextValues;
      }
      return next;
    });
  }

  return (
    <div
      aria-labelledby="catalog-smart-filter-title"
      aria-modal="true"
      className="modal-overlay modal-overlay-blur tag-filter-overlay"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="modal-panel modal-panel-tag-filter tag-filter-drawer"
        onClick={(event) => event.stopPropagation()}
        role="presentation"
      >
        <div aria-hidden="true" className="tag-filter-drawer-handle" />

        <header className="modal-header">
          <div>
            <p className="portal-eyebrow">Catalog filters</p>
            <h2 id="catalog-smart-filter-title">Smart Filters</h2>
            <p className="design-library-tag-filter-description">
              Select values across subjects, styles, themes, and more. Designs must match every
              selection.
            </p>
          </div>
          <button
            aria-label="Close smart filters"
            className="modal-close-button"
            onClick={onClose}
            type="button"
          >
            <XIcon size={18} />
          </button>
        </header>

        <div className="modal-body">
          <div aria-label="Smart filter dimensions" className="tag-filter-featured" role="tablist">
            <div className="tag-filter-featured-pills" role="presentation">
              {SMART_FACET_ATTRIBUTES.map((attr) => {
                const count = normalizeDraftValues(draftFilters[attr]).length;
                const isActive = activeAttr === attr;
                return (
                  <button
                    aria-selected={isActive}
                    className={`tag-filter-featured-pill${isActive ? ' is-selected' : ''}`}
                    key={attr}
                    onClick={() => {
                      setActiveAttr(attr);
                      setSearchQuery('');
                    }}
                    role="tab"
                    type="button"
                  >
                    <span className="tag-filter-featured-pill-name">{SMART_FACET_LABELS[attr]}</span>
                    {count > 0 ? (
                      <span className="tag-filter-featured-pill-count">{count}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="portal-field tag-filter-search-field">
            <span className="tag-filter-action-label tag-filter-action-label-short">Search</span>
            <span className="tag-filter-action-label tag-filter-action-label-full">
              Search {SMART_FACET_LABELS[activeAttr].toLowerCase()}
            </span>
            <input
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={`Search ${SMART_FACET_LABELS[activeAttr].toLowerCase()}...`}
              type="search"
              value={searchQuery}
            />
          </label>

          {loadError ? (
            <p className="design-library-tag-filter-empty" role="alert">
              Smart filters are unavailable right now. Please try again in a moment.
            </p>
          ) : isLoading ? (
            <p className="design-library-tag-filter-empty">Updating filters…</p>
          ) : displayOptions.length === 0 ? (
            <p className="design-library-tag-filter-empty">No matching filters.</p>
          ) : (
            <div
              aria-label={`${SMART_FACET_LABELS[activeAttr]} filters`}
              className="design-library-tag-filter-list"
              role="group"
            >
              {displayOptions.map((option) => (
                <label className="form-checkbox" key={`${activeAttr}-${option.value}`}>
                  <input
                    checked={option.isSelected}
                    onChange={() => toggleValue(activeAttr, option.value)}
                    type="checkbox"
                  />
                  <span>
                    {option.value}
                    {typeof option.count === 'number' ? (
                      <span className="tag-filter-option-count"> ({option.count})</span>
                    ) : null}
                  </span>
                </label>
              ))}
            </div>
          )}

          {!loadError && !isLoading && !searchQuery.trim() && activeDistribution.length > SMART_FACET_TOP_N ? (
            <p className="portal-muted design-library-tag-filter-description">
              Showing top {SMART_FACET_TOP_N} by count. Search to find more.
            </p>
          ) : null}
        </div>

        <footer className="modal-footer modal-footer-tag-filter">
          <button
            className="portal-button portal-button-secondary portal-button-leading-icon"
            onClick={() => setDraftFilters(emptySmartFilters())}
            type="button"
          >
            <XIcon size={14} />
            <span className="tag-filter-action-label tag-filter-action-label-short">Clear</span>
            <span className="tag-filter-action-label tag-filter-action-label-full">Clear filters</span>
          </button>
          <button
            className="portal-button portal-button-secondary portal-button-leading-icon"
            onClick={onClose}
            type="button"
          >
            <XIcon size={14} />
            Cancel
          </button>
          <button
            className="portal-button portal-button-primary portal-button-leading-icon"
            onClick={() => {
              onApply(cloneSmartFilters(draftFilters));
              onClose();
            }}
            type="button"
          >
            <CheckIcon size={14} />
            Apply{visibleDraftCount > 0 ? ` (${visibleDraftCount})` : ''}
          </button>
        </footer>
      </div>
    </div>
  );
}
