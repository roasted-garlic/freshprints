import type { Design } from "../types/design.types";

import { DesignThumbnailPanel } from "./DesignThumbnailPanel";

interface DesignCardProps {
  design: Design;
  isSelectedForPurge?: boolean;
  onSelect: (design: Design) => void;
  onTogglePurgeSelection?: (design: Design) => void;
  showPurgeSelection?: boolean;
}

export function DesignCard({
  design,
  isSelectedForPurge = false,
  onSelect,
  onTogglePurgeSelection,
  showPurgeSelection = false,
}: DesignCardProps) {
  const canSelectForPurge =
    showPurgeSelection && !design.assetsPurgedAt && Boolean(onTogglePurgeSelection);

  return (
    <div className={`design-card-shell${isSelectedForPurge ? " is-selected-for-purge" : ""}`}>
      {canSelectForPurge && onTogglePurgeSelection ? (
        <label className="design-card-purge-select">
          <input
            aria-label={`Select ${design.title} for image delete`}
            checked={isSelectedForPurge}
            onChange={() => onTogglePurgeSelection(design)}
            onClick={(event) => event.stopPropagation()}
            type="checkbox"
          />
        </label>
      ) : null}

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
    </div>
  );
}
