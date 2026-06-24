import { Badge } from "../../../shared/components/Badge";
import type { Design } from "../types/design.types";
import { formatDesignTimestamp } from "../utils/designDateDisplay";
import { formatDesignStatusLabel, getDesignStatusBadgeVariant } from "../utils/designStatusDisplay";
import { DesignThumbnailPanel } from "./DesignThumbnailPanel";

interface DesignCardProps {
  categoryName?: string;
  design: Design;
  onSelect: (design: Design) => void;
}

const MAX_VISIBLE_TAGS = 3;

export function DesignCard({ categoryName, design, onSelect }: DesignCardProps) {
  const visibleTags = design.tags.slice(0, MAX_VISIBLE_TAGS);
  const hiddenTagCount = design.tags.length - visibleTags.length;

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
        <div className="design-card-header">
          <h3 className="design-card-title">{design.title}</h3>
          <Badge variant={getDesignStatusBadgeVariant(design.status)}>
            {formatDesignStatusLabel(design.status)}
          </Badge>
        </div>

        <p className="design-card-category">{categoryName ?? "Uncategorized"}</p>

        {visibleTags.length > 0 ? (
          <div className="design-card-tags">
            {visibleTags.map((tag) => (
              <Badge key={tag} variant="default">
                {tag}
              </Badge>
            ))}
            {hiddenTagCount > 0 ? <span className="design-card-tags-more">+{hiddenTagCount}</span> : null}
          </div>
        ) : (
          <p className="design-card-tags-empty">No tags</p>
        )}

        <p className="design-card-updated">Updated {formatDesignTimestamp(design.updatedAt)}</p>
      </div>
    </button>
  );
}
