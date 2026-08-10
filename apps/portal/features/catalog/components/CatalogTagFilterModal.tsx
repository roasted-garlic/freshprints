'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import type { CatalogTagOption } from '../types/catalog.types';
import { catalogService } from '../services/catalogService';
import {
  buildApprovedCatalogTagOptions,
  countVisibleSelectedTags,
  isCanonicalHalftoneTag,
  sortCatalogTags,
  visibleSelectedTags,
} from '../utils/catalogSearch';
import { buildFeaturedTagPills } from '../utils/featuredCatalogTags';

import { CheckIcon, XIcon } from '../../shared/components/PortalIcons';

interface CatalogTagFilterModalProps {
  approvedTags: CatalogTagOption[];
  /** Applied catalog free-text query (debounced) — refines Algolia facet counts. */
  catalogSearchQuery?: string;
  /** Active catalog category filter — refines Algolia facet counts when set. */
  categoryId?: string;
  /** Set when the generated tag-facet asset could not load. No Firestore fallback exists by design. */
  error?: string | null;
  isOpen: boolean;
  onApply: (selectedTags: string[]) => void;
  onClose: () => void;
  selectedTags: string[];
}

export function CatalogTagFilterModal({
  approvedTags,
  catalogSearchQuery = '',
  categoryId = '',
  error,
  isOpen,
  onApply,
  onClose,
  selectedTags,
}: CatalogTagFilterModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [draftSelectedTags, setDraftSelectedTags] = useState<string[]>(selectedTags);
  const [narrowedTags, setNarrowedTags] = useState<CatalogTagOption[] | null>(null);
  const [narrowError, setNarrowError] = useState<string | null>(null);
  const [featuredTagNames, setFeaturedTagNames] = useState<string[]>([]);
  const narrowGenerationRef = useRef(0);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSearchQuery('');
    setDraftSelectedTags(selectedTags);
  }, [isOpen, selectedTags]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isCancelled = false;
    void catalogService
      .listFeaturedApprovedTags()
      .then((featured) => {
        if (isCancelled) return;
        setFeaturedTagNames(featured.map((tag) => tag.name));
      })
      .catch(() => {
        if (isCancelled) return;
        setFeaturedTagNames([]);
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen]);

  const draftTagsForNarrowing = visibleSelectedTags(draftSelectedTags);
  const draftTagsKey = useMemo(
    () => [...draftTagsForNarrowing].sort((left, right) => left.localeCompare(right)).join('\0'),
    [draftTagsForNarrowing],
  );
  const appliedCatalogSearch = catalogSearchQuery.trim();
  const appliedCategoryId = categoryId.trim();

  // Always refresh facets when the modal opens (global or constrained). Mount-cached
  // `approvedTags` from useCatalogTags can lag Algolia sync (Stage 1b-C: cartoon 3→4).
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isCancelled = false;
    const generation = ++narrowGenerationRef.current;
    const tags = draftTagsKey ? draftTagsKey.split('\0') : [];

    setNarrowedTags(null);
    setNarrowError(null);

    void catalogService
      .listNarrowedApprovedTags(tags, {
        search: appliedCatalogSearch || undefined,
        categoryId: appliedCategoryId || undefined,
      })
      .then((result) => {
        if (isCancelled || generation !== narrowGenerationRef.current) return;
        setNarrowedTags(result);
      })
      .catch((narrowLoadError: unknown) => {
        if (isCancelled || generation !== narrowGenerationRef.current) return;
        const message =
          narrowLoadError instanceof Error ? narrowLoadError.message : 'Unable to load tags.';
        setNarrowError(message);
        setNarrowedTags(null);
      });

    return () => {
      isCancelled = true;
    };
  }, [appliedCatalogSearch, appliedCategoryId, draftTagsKey, isOpen]);

  // Prefer live modal fetch; fall back to mount-cached tags only if the refresh fails.
  const activeTagSource = narrowedTags ?? (narrowError ? approvedTags : null);
  const activeError = narrowError ?? error;
  const facetedTags = useMemo(
    () =>
      activeTagSource
        ? buildApprovedCatalogTagOptions(activeTagSource, draftSelectedTags, searchQuery)
        : [],
    [activeTagSource, draftSelectedTags, searchQuery],
  );
  const featuredPills = useMemo(
    () =>
      buildFeaturedTagPills({
        featuredTagNames,
        facetedTags,
        searchQuery,
      }),
    [facetedTags, featuredTagNames, searchQuery],
  );
  const isNarrowLoading = isOpen && narrowedTags === null && !narrowError;
  const visibleDraftTagCount = countVisibleSelectedTags(draftSelectedTags);

  if (!isOpen) {
    return null;
  }

  function toggleTag(tag: string) {
    setDraftSelectedTags((currentTags) => {
      if (currentTags.includes(tag)) {
        return currentTags.filter((currentTag) => currentTag !== tag);
      }

      return sortCatalogTags([...currentTags, tag]);
    });
  }

  return (
    <div
      aria-labelledby="catalog-tag-filter-title"
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
            <h2 id="catalog-tag-filter-title">Filter by tags</h2>
            <p className="design-library-tag-filter-description">
              Select one or more tags. Designs must include every selected tag.
            </p>
          </div>
          <button aria-label="Close tag filters" className="modal-close-button" onClick={onClose} type="button">
            <XIcon size={18} />
          </button>
        </header>

        <div className="modal-body">
          <label className="portal-field tag-filter-search-field">
            <span className="tag-filter-action-label tag-filter-action-label-short">Search</span>
            <span className="tag-filter-action-label tag-filter-action-label-full">Search tags</span>
            <input
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search tags..."
              type="search"
              value={searchQuery}
            />
          </label>

          {activeError ? (
            <p className="design-library-tag-filter-empty" role="alert">
              Tag filters are unavailable right now. Please try again in a moment.
            </p>
          ) : isNarrowLoading ? (
            <p className="design-library-tag-filter-empty">Updating tags…</p>
          ) : facetedTags.length === 0 && featuredPills.length === 0 ? (
            <p className="design-library-tag-filter-empty">No tags match your search.</p>
          ) : (
            <>
              {featuredPills.length > 0 ? (
                <div aria-label="Featured tags" className="tag-filter-featured">
                  <p className="tag-filter-featured-label">Featured</p>
                  <div className="tag-filter-featured-pills" role="group">
                    {featuredPills.map((pill) => (
                      <button
                        aria-pressed={pill.isSelected}
                        className={`tag-filter-featured-pill${pill.isSelected ? ' is-selected' : ''}`}
                        key={`featured-${pill.tag}`}
                        onClick={() => toggleTag(pill.tag)}
                        type="button"
                      >
                        <span className="tag-filter-featured-pill-name">{pill.tag}</span>
                        {typeof pill.count === 'number' ? (
                          <span className="tag-filter-featured-pill-count">{pill.count}</span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {facetedTags.length > 0 ? (
                <div aria-label="Tag filters" className="design-library-tag-filter-list" role="group">
                  {facetedTags.map((facetedTag) => (
                    <label className="form-checkbox" key={facetedTag.tag}>
                      <input
                        checked={facetedTag.isSelected}
                        onChange={() => toggleTag(facetedTag.tag)}
                        type="checkbox"
                      />
                      <span>
                        {facetedTag.tag}
                        {typeof facetedTag.count === 'number' ? (
                          <span className="tag-filter-option-count"> ({facetedTag.count})</span>
                        ) : null}
                      </span>
                    </label>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>

        <footer className="modal-footer modal-footer-tag-filter">
          <button
            className="portal-button portal-button-secondary portal-button-leading-icon"
            onClick={() =>
              setDraftSelectedTags((currentTags) => currentTags.filter(isCanonicalHalftoneTag))
            }
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
              onApply(draftSelectedTags);
              onClose();
            }}
            type="button"
          >
            <CheckIcon size={14} />
            Apply{visibleDraftTagCount > 0 ? ` (${visibleDraftTagCount})` : ''}
          </button>
        </footer>
      </div>
    </div>
  );
}
