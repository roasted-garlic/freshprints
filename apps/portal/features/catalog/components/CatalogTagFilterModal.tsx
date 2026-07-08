'use client';

import { useEffect, useMemo, useState } from 'react';

import type { CatalogDesign } from '../types/catalog.types';
import { buildCatalogTagOptions, sortCatalogTags } from '../utils/catalogSearch';

import { CheckIcon, XIcon } from '../../shared/components/PortalIcons';

interface CatalogTagFilterModalProps {
  baseDesigns: CatalogDesign[];
  isOpen: boolean;
  onApply: (selectedTags: string[]) => void;
  onClose: () => void;
  selectedTags: string[];
}

export function CatalogTagFilterModal({
  baseDesigns,
  isOpen,
  onApply,
  onClose,
  selectedTags,
}: CatalogTagFilterModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [draftSelectedTags, setDraftSelectedTags] = useState<string[]>(selectedTags);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSearchQuery('');
    setDraftSelectedTags(selectedTags);
  }, [isOpen, selectedTags]);

  const facetedTags = useMemo(
    () => buildCatalogTagOptions(baseDesigns, draftSelectedTags, searchQuery),
    [baseDesigns, draftSelectedTags, searchQuery],
  );

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
      className="modal-overlay modal-overlay-blur"
      onClick={onClose}
      role="dialog"
    >
      <div className="modal-panel modal-panel-tag-filter" onClick={(event) => event.stopPropagation()} role="presentation">
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
          <label className="portal-field">
            <span>Search tags</span>
            <input
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search tags..."
              type="search"
              value={searchQuery}
            />
          </label>

          {facetedTags.length === 0 ? (
            <p className="design-library-tag-filter-empty">No tags match your search.</p>
          ) : (
            <div aria-label="Tag filters" className="design-library-tag-filter-list" role="group">
              {facetedTags.map((facetedTag) => (
                <label className="form-checkbox" key={facetedTag.tag}>
                  <input
                    checked={facetedTag.isSelected}
                    onChange={() => toggleTag(facetedTag.tag)}
                    type="checkbox"
                  />
                  <span>
                    {facetedTag.tag} ({facetedTag.count})
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <footer className="modal-footer">
          <button
            className="portal-button portal-button-secondary portal-button-leading-icon"
            onClick={() => setDraftSelectedTags([])}
            type="button"
          >
            <XIcon size={14} />
            Clear filters
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
            Apply tags{draftSelectedTags.length > 0 ? ` (${draftSelectedTags.length})` : ''}
          </button>
        </footer>
      </div>
    </div>
  );
}
