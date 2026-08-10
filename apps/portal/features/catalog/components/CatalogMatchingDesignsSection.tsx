'use client';

import { artworkPlacementLabel } from '@fresh-prints/shared/constants/design/artworkPlacement.constants';

import { PlusIcon } from '../../shared/components/PortalIcons';
import type { CatalogDesign } from '../types/catalog.types';
import { usePortalCensoredDesignText } from '../utils/portalCensoredDesignText';
import { CatalogThumbnailPanel } from './CatalogThumbnailPanel';

interface CatalogMatchingDesignsSectionProps {
  addingDesignId?: string | null;
  /** Omit for guests — hides per-item Add actions (thumbnails + titles still shown). */
  canAdd?: boolean;
  companionDesigns: CatalogDesign[];
  error?: string | null;
  isLoading?: boolean;
  onAdd?: (design: CatalogDesign) => void;
  onOpenDetails?: (design: CatalogDesign) => void;
  title?: string;
}

/**
 * Customer-safe "Matching designs" list — direct pairwise companions are always pre-filtered
 * to `status == "ready"` by the caller (never reads staff-only `companionLinks`), so this
 * component never has to reason about incomplete staff state; it just renders whatever
 * ready companions it's given.
 */
export function CatalogMatchingDesignsSection({
  addingDesignId = null,
  canAdd = false,
  companionDesigns,
  error = null,
  isLoading = false,
  onAdd,
  onOpenDetails,
  title = 'Matching designs',
}: CatalogMatchingDesignsSectionProps) {
  if (!isLoading && !error && companionDesigns.length === 0) {
    return null;
  }

  return (
    <section className="design-details-section design-matching-designs-section">
      <h3>{title}</h3>

      {isLoading ? <p className="design-details-description">Loading matching designs…</p> : null}

      {error ? (
        <p className="portal-error" role="alert">
          {error}
        </p>
      ) : null}

      {!isLoading && !error && companionDesigns.length > 0 ? (
        <ul className="design-matching-designs-grid" role="list">
          {companionDesigns.map((companion) => (
            <MatchingDesignListItem
              addingDesignId={addingDesignId}
              canAdd={canAdd}
              companion={companion}
              key={companion.id}
              onAdd={onAdd}
              onOpenDetails={onOpenDetails}
            />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function MatchingDesignListItem({
  addingDesignId,
  canAdd,
  companion,
  onAdd,
  onOpenDetails,
}: {
  addingDesignId: string | null;
  canAdd: boolean;
  companion: CatalogDesign;
  onAdd?: (design: CatalogDesign) => void;
  onOpenDetails?: (design: CatalogDesign) => void;
}) {
  const { title: displayTitle } = usePortalCensoredDesignText(companion);

  return (
    <li className="design-matching-designs-item">
      <button
        className="design-matching-designs-thumbnail-button"
        onClick={() => onOpenDetails?.(companion)}
        type="button"
      >
        <CatalogThumbnailPanel
          alt={`${displayTitle} thumbnail`}
          artworkBackgroundHex={companion.artworkBackgroundHex}
          catalogPath={companion.thumbnailPath}
          className="design-matching-designs-thumbnail"
          contentVersion={companion.updatedAtMs}
          decorative
          fallbackLabel="Thumbnail unavailable"
          interactive
          isExplicitContent={companion.isExplicitContent}
          loadingLabel="Loading thumbnail"
          onImageClick={() => onOpenDetails?.(companion)}
          revealMode="none"
        />
        <span className="design-matching-designs-item-title">{displayTitle}</span>
        {companion.artworkPlacement ? (
          <span className="design-matching-designs-placement-badge">
            {artworkPlacementLabel(companion.artworkPlacement)}
          </span>
        ) : null}
      </button>

      {canAdd && onAdd ? (
        <button
          aria-label={`Add ${displayTitle} to request`}
          className="portal-button portal-button-secondary portal-button-sm portal-button-leading-icon design-matching-designs-add-btn"
          disabled={addingDesignId === companion.id}
          onClick={() => onAdd(companion)}
          type="button"
        >
          <PlusIcon size={14} />
          {addingDesignId === companion.id ? 'Adding…' : 'Add'}
        </button>
      ) : null}
    </li>
  );
}
