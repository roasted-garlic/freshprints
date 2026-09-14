'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import type { CatalogCompanionSuggestion } from '../../print-requests/hooks/useAddDesignToRequestFlow';
import { XIcon } from '../../shared/components/PortalIcons';
import type { CatalogDesign } from '../types/catalog.types';
import { usePortalCensoredDesignText } from '../utils/portalCensoredDesignText';
import { CatalogMatchingDesignsSection } from './CatalogMatchingDesignsSection';
import type { CatalogRequestQuantityChangeHandler } from './CatalogRequestQuantityControls';

interface CatalogCompanionSuggestionModalProps {
  companionActionStateById?: Readonly<Record<string, 'pending' | 'added'>>;
  companionQuantities?: Readonly<Record<string, number>>;
  addingDesignId?: string | null;
  canAdd?: boolean;
  onAdd: (design: CatalogDesign) => void;
  onQuantityChange?: CatalogRequestQuantityChangeHandler;
  onRemove?: (designId: string) => void;
  onDismiss: () => void;
  onOpenDetails?: (design: CatalogDesign) => void;
  suggestion: CatalogCompanionSuggestion;
}

/**
 * Post-add "Matching designs" nudge as a dismissible modal — never auto-adds companions.
 * Shown anywhere over the page so it does not push catalog layout.
 */
export function CatalogCompanionSuggestionModal({
  addingDesignId = null,
  companionActionStateById,
  companionQuantities,
  canAdd = true,
  onAdd,
  onDismiss,
  onOpenDetails,
  onQuantityChange,
  onRemove,
  suggestion,
}: CatalogCompanionSuggestionModalProps) {
  const { title: sourceTitle } = usePortalCensoredDesignText(suggestion.sourceDesign);
  const suggestionIdentity = useMemo(
    () =>
      `${suggestion.sourceDesign.id}:${suggestion.companions
        .map(({ id }) => id)
        .sort()
        .join(',')}`,
    [suggestion.companions, suggestion.sourceDesign.id],
  );
  const seenSuggestionIdentityRef = useRef<string | null>(null);
  const [hasConfirmedCompanionAdd, setHasConfirmedCompanionAdd] = useState(false);

  useEffect(() => {
    const companionIds = new Set(suggestion.companions.map(({ id }) => id));
    const hasMatchingCompanionAdd = Object.entries(companionActionStateById ?? {}).some(
      ([designId, state]) => companionIds.has(designId) && state === 'added',
    );

    if (seenSuggestionIdentityRef.current !== suggestionIdentity) {
      seenSuggestionIdentityRef.current = suggestionIdentity;
      if (hasMatchingCompanionAdd) {
        setHasConfirmedCompanionAdd(true);
      } else {
        setHasConfirmedCompanionAdd(false);
      }
      return;
    }

    if (hasMatchingCompanionAdd) {
      setHasConfirmedCompanionAdd(true);
    }
  }, [companionActionStateById, suggestion.companions, suggestionIdentity]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onDismiss();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onDismiss]);

  const titleId = 'catalog-companion-suggestion-title';

  function handleOpenDetails(design: CatalogDesign) {
    onDismiss();
    // Defer so this modal unmounts before Design Details opens (avoids stacking behind).
    window.requestAnimationFrame(() => {
      onOpenDetails?.(design);
    });
  }

  return (
    <div
      aria-labelledby={titleId}
      aria-modal="true"
      className="modal-overlay modal-overlay-blur design-companion-suggestion-overlay"
      onClick={onDismiss}
      role="dialog"
    >
      <div
        className="modal-panel design-companion-suggestion-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header design-companion-suggestion-modal-header">
          <div className="design-companion-suggestion-modal-header-copy">
            <p className="portal-eyebrow">Matching designs</p>
            <h2 id={titleId}>Designs that go with “{sourceTitle}”</h2>
            <p className="design-companion-suggestion-modal-lede">
              Optional — add any you want. Nothing is added automatically.
            </p>
          </div>
          <button
            aria-label="Close matching designs"
            className="design-companion-suggestion-dismiss"
            onClick={onDismiss}
            type="button"
          >
            <XIcon size={18} />
          </button>
        </header>

        <div className="modal-body design-companion-suggestion-modal-body">
          <CatalogMatchingDesignsSection
            addingDesignId={addingDesignId}
            companionActionStateById={companionActionStateById}
            companionQuantities={companionQuantities}
            canAdd={canAdd}
            companionDesigns={suggestion.companions}
            onAdd={onAdd}
            onOpenDetails={onOpenDetails ? handleOpenDetails : undefined}
            onQuantityChange={onQuantityChange}
            onRemove={onRemove}
            title="Ready companions"
          />
        </div>

        <footer className="modal-footer design-companion-suggestion-modal-footer">
          <button className="portal-button portal-button-secondary" onClick={onDismiss} type="button">
            {hasConfirmedCompanionAdd ? 'Done' : 'Not now'}
          </button>
        </footer>
      </div>
    </div>
  );
}

/** @deprecated Prefer CatalogCompanionSuggestionModal — kept as alias during rename. */
export const CatalogCompanionSuggestionBanner = CatalogCompanionSuggestionModal;
