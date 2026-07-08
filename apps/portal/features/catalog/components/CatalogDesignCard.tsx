'use client';

import type { CatalogDesign } from '../types/catalog.types';
import { CatalogThumbnailPanel } from './CatalogThumbnailPanel';

interface CatalogDesignCardProps {
  design: CatalogDesign;
  onSelect: (design: CatalogDesign) => void;
}

export function CatalogDesignCard({ design, onSelect }: CatalogDesignCardProps) {
  return (
    <button className="design-card" onClick={() => onSelect(design)} type="button">
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
  );
}
