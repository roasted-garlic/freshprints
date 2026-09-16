import type { Design } from "../types/design.types";

import { DesignThumbnailPanel } from "./DesignThumbnailPanel";

interface DesignCardProps {
  design: Design;
  isSelectedForAiReprocess?: boolean;
  isAiReprocessSelectable?: boolean;
  isSelectedForPurge?: boolean;
  onToggleAiReprocessSelection?: (design: Design) => void;
  onSelect: (design: Design) => void;
  onTogglePurgeSelection?: (design: Design) => void;
  showPurgeSelection?: boolean;
}

export function DesignCard({
  design,
  isSelectedForAiReprocess = false,
  isAiReprocessSelectable = true,
  isSelectedForPurge = false,
  onToggleAiReprocessSelection,
  onSelect,
  onTogglePurgeSelection,
  showPurgeSelection = false,
}: DesignCardProps) {
  const canSelectForPurge =
    showPurgeSelection && !design.assetsPurgedAt && Boolean(onTogglePurgeSelection);

  return (
    <div
      className={`design-card-shell${isSelectedForPurge ? " is-selected-for-purge" : ""}${
        isSelectedForAiReprocess ? " is-selected-for-ai-reprocess" : ""
      }`}
    >
      {onToggleAiReprocessSelection && isAiReprocessSelectable ? (
        <label className="design-card-ai-select studio-checkbox studio-checkbox--overlay">
          <input
            aria-label={`${isSelectedForAiReprocess ? "Deselect" : "Select"} ${design.title} for AI Review`}
            checked={isSelectedForAiReprocess}
            onChange={() => onToggleAiReprocessSelection(design)}
            onClick={(event) => event.stopPropagation()}
            type="checkbox"
          />
        </label>
      ) : null}
      {canSelectForPurge && onTogglePurgeSelection ? (
        <label className="design-card-purge-select studio-checkbox studio-checkbox--danger studio-checkbox--overlay">
          <input
            aria-label={`Select ${design.title} for permanent delete`}
            checked={isSelectedForPurge}
            onChange={() => onTogglePurgeSelection(design)}
            onClick={(event) => event.stopPropagation()}
            type="checkbox"
          />
        </label>
      ) : null}

      <button
        aria-pressed={
          onToggleAiReprocessSelection && isAiReprocessSelectable
            ? isSelectedForAiReprocess
            : undefined
        }
        className="card design-card"
        onClick={() =>
          onToggleAiReprocessSelection
            ? onToggleAiReprocessSelection(design)
            : onSelect(design)
        }
        type="button"
      >
        <DesignThumbnailPanel
          alt={`${design.title} thumbnail`}
          artworkBackgroundHex={design.artworkBackgroundHex}
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
