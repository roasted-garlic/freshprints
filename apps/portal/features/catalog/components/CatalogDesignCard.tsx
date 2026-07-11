'use client';

import { PlusIcon } from '../../shared/components/PortalIcons';
import type { CatalogDesign } from '../types/catalog.types';
import { CatalogThumbnailPanel } from './CatalogThumbnailPanel';

interface CatalogDesignCardProps {
  design: CatalogDesign;
  isAdding?: boolean;
  onAddToRequest: (design: CatalogDesign) => void;
  onSelect: (design: CatalogDesign) => void;
}

export function CatalogDesignCard({
  design,
  isAdding = false,
  onAddToRequest,
  onSelect,
}: CatalogDesignCardProps) {
  return (
    <article className="design-card">
      <button
        className="design-card-open"
        onClick={() => onSelect(design)}
        type="button"
      >
        <CatalogThumbnailPanel
          alt={`${design.title} thumbnail`}
          catalogPath={design.thumbnailPath}
          className="design-card-thumbnail"
          decorative
          fallbackLabel="Thumbnail unavailable"
          loadingLabel="Loading thumbnail"
        />

        <div className="design-card-body">
          <h3 className="design-card-title">{design.title}</h3>
        </div>
      </button>

      <button
        aria-label={isAdding ? `Adding ${design.title} to request` : `Add ${design.title} to request`}
        className="portal-button portal-button-secondary portal-button-sm portal-button-leading-icon design-card-add-btn"
        disabled={isAdding}
        onClick={() => onAddToRequest(design)}
        type="button"
      >
        <PlusIcon size={14} />
        {isAdding ? 'Adding…' : 'Add to request'}
      </button>
    </article>
  );
}
