'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { resolveArtworkBackgroundHex } from '@fresh-prints/shared/constants/design/artworkBackground.constants';
import { filterPreviewableItemIds } from '@fresh-prints/shared/utils/previewLightboxNavigation';

import { useCatalogDesignViewAnalytics } from '../../analytics/hooks/useCatalogDesignViewAnalytics';
import { useAuth } from '../../auth/context/AuthContext';
import { redirectToPortalLogin } from '../../auth/utils/requirePortalLogin';
import { CatalogFavoriteButton } from '../../favorites/components/CatalogFavoriteButton';
import { PlusIcon } from '../../shared/components/PortalIcons';
import { useCatalogDerivativeUrl } from '../hooks/useCatalogDerivativeUrl';
import { useCatalogReadyCompanionDesigns } from '../hooks/useCatalogReadyCompanionDesigns';
import type { CatalogDesign } from '../types/catalog.types';
import { PORTAL_DESIGN_DEEP_LINK_PARAM } from '../utils/portalDesignShareUrls';
import { usePortalCensoredDesignText } from '../utils/portalCensoredDesignText';
import { CatalogArtworkBackgroundPreviewPicker } from './CatalogArtworkBackgroundPreviewPicker';
import { CatalogDesignShareButton } from './CatalogDesignShareButton';
import { CatalogDesignIssueReportModal } from './CatalogDesignIssueReportModal';
import { CatalogMatchingDesignsSection } from './CatalogMatchingDesignsSection';
import {
  CatalogPreviewLightbox,
  type CatalogPreviewLightboxNavItem,
} from './CatalogPreviewLightbox';
import {
  CatalogRequestQuantityControls,
  type CatalogRequestQuantityChangeHandler,
} from './CatalogRequestQuantityControls';
import { CatalogThumbnailPanel } from './CatalogThumbnailPanel';

function isCatalogDesignPreviewable(design: CatalogDesign): boolean {
  return Boolean(design.previewPath?.trim() || design.thumbnailPath?.trim());
}

interface CatalogDesignDetailsModalProps {
  /** In-flight designId from the add flow — powers the busy state on Matching designs Add buttons. */
  addingDesignId?: string | null;
  /** When false, Add to request is disabled (request full or Cap A exhausted). Favorite stays enabled. */
  canAddPrints?: boolean;
  /**
   * Current Request (or selection-mode) quantity for the open design.
   * When `isInCurrentRequest` and qty handlers are present, replaces Add with shared stepper.
   */
  currentRequestQuantity?: number;
  design: CatalogDesign | null;
  exhaustedHelperText?: string | null;
  exhaustedStatusText?: string | null;
  isAdding?: boolean;
  /** When true, design is already on the Current Request (or selection) — hide the full-request label. */
  isInCurrentRequest?: boolean;
  isOpen: boolean;
  /**
   * Host-supplied ordered designs currently displayed (filtered/loaded rail or grid).
   * Enables Previous/Next in the details lightbox via continuous `onOpenDesign` swaps.
   */
  navigationDesigns?: readonly CatalogDesign[];
  /** When omitted for guests, modal shows Sign in to add to a request CTA. */
  onAddToRequest?: (design: CatalogDesign) => void;
  onClose: () => void;
  /** Swap the modal to show a different design — used by Matching designs and lightbox nav. */
  onOpenDesign?: (design: CatalogDesign) => void;
  /** Same handlers as CatalogSelectionCard — required with onRemove when in Current Request. */
  onQuantityChange?: CatalogRequestQuantityChangeHandler;
  onRemoveFromRequest?: (designId: string) => void;
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" height="18" viewBox="0 0 24 24" width="18">
      <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

export function CatalogDesignDetailsModal({
  addingDesignId = null,
  canAddPrints = true,
  currentRequestQuantity = 0,
  design,
  exhaustedStatusText = null,
  isAdding = false,
  isInCurrentRequest = false,
  isOpen,
  navigationDesigns,
  onAddToRequest,
  onClose,
  onOpenDesign,
  onQuantityChange,
  onRemoveFromRequest,
}: CatalogDesignDetailsModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();
  const [isPreviewLightboxOpen, setIsPreviewLightboxOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  /**
   * One reveal gate per open-details session, shared by the hero panel and the lightbox —
   * Design Details is the sole place a customer can reveal censored artwork; once revealed
   * here it stays revealed for both surfaces until a different design is opened.
   */
  const [sessionRevealed, setSessionRevealed] = useState(false);
  const reportTriggerRef = useRef<HTMLButtonElement>(null);
  const [previewBgHex, setPreviewBgHex] = useState(() =>
    resolveArtworkBackgroundHex(design?.artworkBackgroundHex),
  );
  const statusText = exhaustedStatusText;
  const requestFullLabel =
    !canAddPrints && statusText && !isInCurrentRequest ? statusText : null;
  const exhaustedTitle = requestFullLabel ?? undefined;
  const previewPath = design?.previewPath ?? design?.thumbnailPath;
  const { url: previewUrl } = useCatalogDerivativeUrl(
    isOpen ? previewPath : undefined,
    design?.updatedAtMs,
  );
  const lightboxNavigationItems = useMemo((): CatalogPreviewLightboxNavItem[] | undefined => {
    if (!navigationDesigns || !onOpenDesign || navigationDesigns.length <= 1) {
      return undefined;
    }

    const previewableIds = new Set(
      filterPreviewableItemIds(
        navigationDesigns,
        (entry) => entry.id,
        isCatalogDesignPreviewable,
      ),
    );

    if (previewableIds.size <= 1) {
      return undefined;
    }

    return navigationDesigns
      .filter((entry) => previewableIds.has(entry.id))
      .map((entry) => ({
        id: entry.id,
        alt: entry.title,
        artworkBackgroundHex: entry.artworkBackgroundHex,
        isExplicitContent: entry.isExplicitContent,
        // Pattern A: parent supplies the active design's resolved previewUrl.
      }));
  }, [navigationDesigns, onOpenDesign]);

  function handleLightboxActiveItemChange(itemId: string) {
    if (!onOpenDesign || !navigationDesigns) {
      return;
    }
    const nextDesign = navigationDesigns.find((entry) => entry.id === itemId);
    if (nextDesign) {
      onOpenDesign(nextDesign);
    }
  }
  const addDisabled = isAdding || !canAddPrints;
  const quantityChangeHandler = onQuantityChange;
  const removeFromRequestHandler = onRemoveFromRequest;
  const showQuantityControls =
    isInCurrentRequest &&
    typeof quantityChangeHandler === 'function' &&
    typeof removeFromRequestHandler === 'function';
  const designDefaultBgHex = resolveArtworkBackgroundHex(design?.artworkBackgroundHex);
  const showGuestSignInCta = !onAddToRequest && !isAuthenticated;
  const { companionDesigns, error: companionError, isLoading: isLoadingCompanions } =
    useCatalogReadyCompanionDesigns(design?.companionDesignIds, design?.id);
  useCatalogDesignViewAnalytics({
    isOpen,
    designId: design?.id ?? null,
    title: design?.title,
  });
  const { title: displayTitle, description: displayDescription } = usePortalCensoredDesignText(
    design ?? { title: '', description: '', isExplicitContent: false },
    { sessionRevealed },
  );

  function buildSignInReturnTo(designId: string): string {
    const next = new URLSearchParams(searchParams.toString());
    next.set(PORTAL_DESIGN_DEEP_LINK_PARAM, designId);
    return `${pathname}?${next.toString()}`;
  }

  function handleGuestSignIn(designId: string) {
    redirectToPortalLogin(router, buildSignInReturnTo(designId));
  }

  function handleReportIssue() {
    if (!isAuthenticated) { handleGuestSignIn(design!.id); return; }
    setIsReportModalOpen(true);
  }

  useEffect(() => {
    if (!isOpen) {
      setIsPreviewLightboxOpen(false);
      setSessionRevealed(false);
      return;
    }
    setPreviewBgHex(resolveArtworkBackgroundHex(design?.artworkBackgroundHex));
    setSessionRevealed(false);
  }, [isOpen, design?.id, design?.artworkBackgroundHex]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isPreviewLightboxOpen) {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isPreviewLightboxOpen, onClose]);

  if (!isOpen || !design) {
    return null;
  }

  return (
    <>
      <div
        aria-labelledby="catalog-design-details-title"
        aria-modal="true"
        className="modal-overlay modal-overlay-blur"
        onClick={onClose}
        role="dialog"
      >
        <div
          className="modal-panel modal-panel-design-details"
          onClick={(event) => event.stopPropagation()}
          role="presentation"
        >
          <div
            className="design-details-hero"
            style={{
              ['--color-artwork-preview-bg' as string]: previewBgHex,
              backgroundColor: previewBgHex,
            }}
          >
            <CatalogThumbnailPanel
              alt={`${displayTitle} preview`}
              artworkBackgroundHex={previewBgHex}
              catalogPath={previewPath}
              className="design-details-hero-media"
              contentVersion={design.updatedAtMs}
              fallbackLabel="Preview unavailable"
              interactive
              isExplicitContent={design.isExplicitContent}
              loadingLabel="Loading preview"
              onImageClick={() => setIsPreviewLightboxOpen(true)}
              onReveal={() => setSessionRevealed(true)}
              prioritizeLoading
              revealMode="session"
              sessionRevealed={sessionRevealed}
            />

            <button
              aria-label="Close design details"
              className="modal-close-button design-details-close-button"
              onClick={onClose}
              type="button"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="modal-body design-details-body">
            <div className="design-details-toolbar">
              <div className="design-details-toolbar-start">
                <button className="portal-button portal-button-secondary portal-button-sm" onClick={handleReportIssue} ref={reportTriggerRef} type="button">Report an Issue</button>
                <div className="design-details-toolbar-controls">
                  <CatalogArtworkBackgroundPreviewPicker
                    designDefaultHex={designDefaultBgHex}
                    onPreviewHexChange={setPreviewBgHex}
                    previewHex={previewBgHex}
                  />
                  <CatalogDesignShareButton design={design} variant="labeled" />
                  <CatalogFavoriteButton
                    className="design-details-favorite-btn"
                    designId={design.id}
                    designTitle={displayTitle}
                  />
                </div>
              </div>
              <div className="design-details-primary-action-row">
                {requestFullLabel ? (
                  <p className="design-details-request-full-label is-request-full">{requestFullLabel}</p>
                ) : null}
                {showQuantityControls ? (
                  <CatalogRequestQuantityControls
                    canAddPrints={canAddPrints}
                    className="design-details-qty-controls design-selection-card-qty-controls portal-request-item-stepper portal-card-input-shell"
                    designId={design.id}
                    designTitle={displayTitle}
                    disabled={isAdding}
                    exhaustedTitle={
                      !canAddPrints && statusText ? statusText : undefined
                    }
                    onQuantityChange={quantityChangeHandler}
                    onRemove={removeFromRequestHandler}
                    quantity={currentRequestQuantity > 0 ? currentRequestQuantity : 1}
                  />
                ) : onAddToRequest ? (
                  <button
                    className="portal-button portal-button-primary portal-button-sm portal-button-leading-icon design-details-add-btn"
                    disabled={addDisabled}
                    onClick={() => onAddToRequest(design)}
                    title={exhaustedTitle}
                    type="button"
                  >
                    <PlusIcon size={14} />
                    {isAdding ? 'Adding…' : 'Add to request'}
                  </button>
                ) : showGuestSignInCta ? (
                  <button
                    className="portal-button portal-button-primary portal-button-sm design-details-add-btn"
                    onClick={() => handleGuestSignIn(design.id)}
                    type="button"
                  >
                    Sign in to add to a request
                  </button>
                ) : null}
              </div>
            </div>
            <h2 id="catalog-design-details-title">{displayTitle}</h2>

            <section className="design-details-section">
              <h3>Description</h3>
              <p className="design-details-description">{displayDescription.trim() || '—'}</p>
            </section>

            <section className="design-details-section">
              <h3>Tags</h3>
              {design.tags.length > 0 ? (
                <div className="design-details-tags">
                  {design.tags.map((tag) => (
                    <span className="design-details-tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="design-details-description">—</p>
              )}
            </section>

            {design.companionDesignIds?.length ? (
              <CatalogMatchingDesignsSection
                addingDesignId={addingDesignId}
                canAdd={Boolean(onAddToRequest) && canAddPrints}
                companionDesigns={companionDesigns}
                error={companionError}
                isLoading={isLoadingCompanions}
                onAdd={onAddToRequest}
                onOpenDetails={onOpenDesign}
              />
            ) : null}
          </div>
        </div>
      </div>

      <CatalogPreviewLightbox
        activeItemId={design.id}
        alt={displayTitle}
        artworkBackgroundHex={previewBgHex}
        isExplicitContent={design.isExplicitContent}
        isOpen={isPreviewLightboxOpen}
        navigationItems={lightboxNavigationItems}
        onActiveItemChange={handleLightboxActiveItemChange}
        onClose={() => setIsPreviewLightboxOpen(false)}
        onReveal={() => setSessionRevealed(true)}
        previewUrl={previewUrl}
        sessionRevealed={sessionRevealed}
      />
      <CatalogDesignIssueReportModal designId={design.id} isOpen={isReportModalOpen} onClose={() => { setIsReportModalOpen(false); window.requestAnimationFrame(() => reportTriggerRef.current?.focus()); }} />
    </>
  );
}
