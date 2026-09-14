'use client';

import { artworkPlacementLabel } from '@fresh-prints/shared/constants/design/artworkPlacement.constants';

import { PlusIcon } from '../../shared/components/PortalIcons';
import type { CatalogDesign } from '../types/catalog.types';
import { usePortalCensoredDesignText } from '../utils/portalCensoredDesignText';
import {
  CatalogRequestQuantityControls,
  type CatalogRequestQuantityChangeHandler,
} from './CatalogRequestQuantityControls';
import { CatalogThumbnailPanel } from './CatalogThumbnailPanel';

interface CatalogMatchingDesignsSectionProps {
  /** Design ids currently in the working request, keyed to their real quantity. */
  companionQuantities?: Readonly<Record<string, number>>;
  /** Brief status while a companion add is awaiting the server, then the success transition. */
  companionActionStateById?: Readonly<Record<string, 'pending' | 'added'>>;
  addingDesignId?: string | null;
  /** Omit for guests — hides per-item Add actions (thumbnails + titles still shown). */
  canAdd?: boolean;
  companionDesigns: CatalogDesign[];
  error?: string | null;
  isLoading?: boolean;
  onAdd?: (design: CatalogDesign) => void;
  onQuantityChange?: CatalogRequestQuantityChangeHandler;
  onRemove?: (designId: string) => void;
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
  companionActionStateById,
  companionQuantities,
  canAdd = false,
  companionDesigns,
  error = null,
  isLoading = false,
  onAdd,
  onOpenDetails,
  onQuantityChange,
  onRemove,
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
              actionState={companionActionStateById?.[companion.id]}
              canAdd={canAdd}
              quantity={companionQuantities?.[companion.id] ?? 0}
              companion={companion}
              key={companion.id}
              onAdd={onAdd}
              onOpenDetails={onOpenDetails}
              onQuantityChange={onQuantityChange}
              onRemove={onRemove}
            />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function MatchingDesignListItem({
  actionState,
  addingDesignId,
  canAdd,
  companion,
  quantity,
  onAdd,
  onOpenDetails,
  onQuantityChange,
  onRemove,
}: {
  actionState?: 'pending' | 'added';
  addingDesignId: string | null;
  canAdd: boolean;
  companion: CatalogDesign;
  quantity: number;
  onAdd?: (design: CatalogDesign) => void;
  onOpenDetails?: (design: CatalogDesign) => void;
  onQuantityChange?: CatalogRequestQuantityChangeHandler;
  onRemove?: (designId: string) => void;
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

      {actionState === 'pending' ? (
        <button
          aria-label={`Adding ${displayTitle} to request`}
          className="portal-button portal-button-secondary portal-button-sm portal-button-leading-icon design-matching-designs-add-btn"
          disabled
          type="button"
        >
          <PlusIcon size={14} />
          Adding…
        </button>
      ) : actionState === 'added' ? (
        <span aria-live="polite" className="design-matching-designs-added" role="status">
          Added
        </span>
      ) : quantity > 0 && onQuantityChange && onRemove ? (
        <CatalogRequestQuantityControls
          canAddPrints={canAdd}
          className="design-matching-designs-qty-controls design-selection-card-qty-controls portal-request-item-stepper portal-card-input-shell"
          designId={companion.id}
          designTitle={displayTitle}
          disabled={actionState === 'pending'}
          onQuantityChange={onQuantityChange}
          onRemove={onRemove}
          quantity={quantity}
        />
      ) : canAdd && onAdd ? (
        <button
          aria-label={`Add ${displayTitle} to request`}
          className="portal-button portal-button-secondary portal-button-sm portal-button-leading-icon design-matching-designs-add-btn"
          disabled={addingDesignId === companion.id || actionState === 'pending'}
          onClick={() => onAdd(companion)}
          type="button"
        >
          <PlusIcon size={14} />
          {addingDesignId === companion.id || actionState === 'pending' ? 'Adding…' : 'Add'}
        </button>
      ) : null}
    </li>
  );
}
