'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { resolveArtworkBackgroundHex } from '@fresh-prints/shared/constants/design/artworkBackground.constants';

import { useAuth } from '../../auth/context/AuthContext';
import { redirectToPortalLogin } from '../../auth/utils/requirePortalLogin';
import { CatalogFavoriteButton } from '../../favorites/components/CatalogFavoriteButton';
import { PlusIcon } from '../../shared/components/PortalIcons';
import { useCatalogDerivativeUrl } from '../hooks/useCatalogDerivativeUrl';
import type { CatalogDesign } from '../types/catalog.types';
import { PORTAL_DESIGN_DEEP_LINK_PARAM } from '../utils/portalDesignShareUrls';
import { CatalogArtworkBackgroundPreviewPicker } from './CatalogArtworkBackgroundPreviewPicker';
import { CatalogDesignShareButton } from './CatalogDesignShareButton';
import { CatalogDesignIssueReportModal } from './CatalogDesignIssueReportModal';
import { CatalogPreviewLightbox } from './CatalogPreviewLightbox';
import { CatalogThumbnailPanel } from './CatalogThumbnailPanel';

interface CatalogDesignDetailsModalProps {
  /** When false, Add to request is disabled (request full or Cap A exhausted). Favorite stays enabled. */
  canAddPrints?: boolean;
  design: CatalogDesign | null;
  exhaustedHelperText?: string | null;
  exhaustedStatusText?: string | null;
  isAdding?: boolean;
  /** When true, design is already on the Current Request (or selection) — hide the full-request label. */
  isInCurrentRequest?: boolean;
  isOpen: boolean;
  /** When omitted for guests, modal shows Sign in to add to a request CTA. */
  onAddToRequest?: (design: CatalogDesign) => void;
  onClose: () => void;
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" height="18" viewBox="0 0 24 24" width="18">
      <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

export function CatalogDesignDetailsModal({
  canAddPrints = true,
  design,
  exhaustedStatusText = null,
  isAdding = false,
  isInCurrentRequest = false,
  isOpen,
  onAddToRequest,
  onClose,
}: CatalogDesignDetailsModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();
  const [isPreviewLightboxOpen, setIsPreviewLightboxOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
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
  const addDisabled = isAdding || !canAddPrints;
  const designDefaultBgHex = resolveArtworkBackgroundHex(design?.artworkBackgroundHex);
  const showGuestSignInCta = !onAddToRequest && !isAuthenticated;

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
      return;
    }
    setPreviewBgHex(resolveArtworkBackgroundHex(design?.artworkBackgroundHex));
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
              alt={`${design.title} preview`}
              artworkBackgroundHex={previewBgHex}
              catalogPath={previewPath}
              className="design-details-hero-media"
              contentVersion={design.updatedAtMs}
              fallbackLabel="Preview unavailable"
              interactive
              loadingLabel="Loading preview"
              onImageClick={() => setIsPreviewLightboxOpen(true)}
              prioritizeLoading
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
                    designTitle={design.title}
                  />
                </div>
              </div>
              <div className="design-details-primary-action-row">
                {requestFullLabel ? (
                  <p className="design-details-request-full-label is-request-full">{requestFullLabel}</p>
                ) : null}
                {onAddToRequest ? (
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
            <h2 id="catalog-design-details-title">{design.title}</h2>

            <section className="design-details-section">
              <h3>Description</h3>
              <p className="design-details-description">{design.description?.trim() || '—'}</p>
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
          </div>
        </div>
      </div>

      <CatalogPreviewLightbox
        alt={design.title}
        artworkBackgroundHex={previewBgHex}
        isOpen={isPreviewLightboxOpen}
        onClose={() => setIsPreviewLightboxOpen(false)}
        previewUrl={previewUrl}
      />
      <CatalogDesignIssueReportModal designId={design.id} isOpen={isReportModalOpen} onClose={() => { setIsReportModalOpen(false); window.requestAnimationFrame(() => reportTriggerRef.current?.focus()); }} />
    </>
  );
}
