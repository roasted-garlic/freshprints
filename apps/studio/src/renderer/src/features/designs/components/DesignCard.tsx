import type { Design } from "../types/design.types";

import { DesignThumbnailPanel } from "./DesignThumbnailPanel";

interface DesignCardProps {
  design: Design;
  onSelect: (design: Design) => void;
}

export function DesignCard({ design, onSelect }: DesignCardProps) {
  return (
    <button className="card design-card" onClick={() => onSelect(design)} type="button">
      <DesignThumbnailPanel
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
