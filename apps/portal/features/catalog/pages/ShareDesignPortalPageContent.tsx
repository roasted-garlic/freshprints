'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { resolveArtworkBackgroundHex } from '@fresh-prints/shared/constants/design/artworkBackground.constants';

import { useAuth } from '../../auth/context/AuthContext';
import { redirectToPortalLogin } from '../../auth/utils/requirePortalLogin';
import { buildPortalDesignSharePath, isValidPortalDesignShareId } from '../utils/portalDesignShareUrls';
import { catalogService } from '../services/catalogService';
import type { CatalogDesign } from '../types/catalog.types';
import { useCatalogCategories } from '../hooks/useCatalogCategories';
import { CatalogFavoriteButton } from '../../favorites/components/CatalogFavoriteButton';
import { CatalogArtworkBackgroundPreviewPicker } from '../components/CatalogArtworkBackgroundPreviewPicker';
import { CatalogDesignShareButton } from '../components/CatalogDesignShareButton';
import { CatalogDesignIssueReportModal } from '../components/CatalogDesignIssueReportModal';
import { CatalogPreviewLightbox } from '../components/CatalogPreviewLightbox';
import { CatalogThumbnailPanel } from '../components/CatalogThumbnailPanel';
import { useCatalogDerivativeUrl } from '../hooks/useCatalogDerivativeUrl';
import { usePortalCensoredDesignText } from '../utils/portalCensoredDesignText';
import { ArrowLeftIcon, PlusIcon } from '../../shared/components/PortalIcons';
import { PortalConfirmModal } from '../../shared/components/PortalConfirmModal';
import { PortalPickContinuableRequestModal } from '../../shared/components/PortalPickContinuableRequestModal';
import { usePortalPrintRequests } from '../../print-requests/context/PortalPrintRequestContext';
import { useAddDesignToRequestFlow } from '../../print-requests/hooks/useAddDesignToRequestFlow';
import { CATALOG_HOME_PATH } from '../../print-requests/utils/catalogSelectionNavigation';
import type { PortalDesignShareMeta } from '../services/portalDesignShareMetaService';

interface ShareDesignPortalPageContentProps {
  designId: string;
  initialMeta: PortalDesignShareMeta | null;
}

/**
 * In-shell share landing: same chrome as the rest of Portal, auth-aware Add CTAs.
 */
export function ShareDesignPortalPageContent({
  designId,
  initialMeta,
}: ShareDesignPortalPageContentProps) {
  const router = useRouter();
  const { isAuthenticated, isInitialBootstrap } = useAuth();
  const { categories } = useCatalogCategories();
  const {
    continuableRequests,
    createPrintRequest,
    currentRequestAggregates,
    refreshRequests,
    reloadWorkingItems,
  } = usePortalPrintRequests();

  const addDesignFlow = useAddDesignToRequestFlow({
    continuableRequests,
    createPrintRequest,
    refreshRequests,
    reloadWorkingItems,
  });

  const [design, setDesign] = useState<CatalogDesign | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreviewLightboxOpen, setIsPreviewLightboxOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [sessionRevealed, setSessionRevealed] = useState(false);
  const reportTriggerRef = useRef<HTMLButtonElement>(null);
  const [previewBgHex, setPreviewBgHex] = useState(() =>
    resolveArtworkBackgroundHex(undefined),
  );

  useEffect(() => {
    let cancelled = false;
    setSessionRevealed(false);

    if (!isValidPortalDesignShareId(designId)) {
      setDesign(null);
      setLoadError('This share link is invalid.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    void (async () => {
      try {
        const designs = await catalogService.getReadyDesignsByIds([designId]);
        if (cancelled) {
          return;
        }
                const next = designs[0] ?? null;
                setDesign(next);
                if (!next) {
          setLoadError('This design is not available in the public catalog.');
        } else {
          setPreviewBgHex(resolveArtworkBackgroundHex(next.artworkBackgroundHex));
        }
      } catch (error) {
        if (!cancelled) {
          setDesign(null);
          setLoadError(
            error instanceof Error ? error.message : 'Unable to load this design.',
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [designId]);

  const categoryName = useMemo(() => {
    if (initialMeta?.categoryName) {
      return initialMeta.categoryName;
    }
    if (!design?.categoryId) {
      return null;
    }
    return categories.find((category) => category.id === design.categoryId)?.name ?? null;
  }, [categories, design?.categoryId, initialMeta?.categoryName]);

  const title = design?.title ?? initialMeta?.title ?? 'Design';
  const description =
    design?.description?.trim() ||
    initialMeta?.description ||
    '—';
  const { title: displayTitle, description: displayDescription } = usePortalCensoredDesignText(
    design ?? {
      title,
      description,
      isExplicitContent: false,
    },
    { sessionRevealed },
  );
  const visibleTitle = design ? displayTitle : title;
  const visibleDescription = design ? displayDescription : description;
  const tags = design?.tags?.length ? design.tags : (initialMeta?.tags ?? []);
  const previewPath = design?.previewPath ?? design?.thumbnailPath;
  const { url: previewUrl } = useCatalogDerivativeUrl(previewPath, design?.updatedAtMs);
  const designDefaultBgHex = resolveArtworkBackgroundHex(design?.artworkBackgroundHex);
  const isInCurrentRequest =
    design !== null && (currentRequestAggregates.quantityByDesignId[design.id] ?? 0) > 0;
  const requestFullLabel =
    !addDesignFlow.canAddPrints &&
    addDesignFlow.exhaustedStatusText &&
    !isInCurrentRequest
      ? addDesignFlow.exhaustedStatusText
      : null;

  function handleGuestSignIn() {
    redirectToPortalLogin(router, buildPortalDesignSharePath(designId));
  }

  function handleReportIssue() {
    if (!isAuthenticated) { handleGuestSignIn(); return; }
    setIsReportModalOpen(true);
  }

  function handleAddToRequest() {
    if (!design) {
      return;
    }
    if (!isAuthenticated) {
      handleGuestSignIn();
      return;
    }
    addDesignFlow.addDesign(design);
  }

  if (isInitialBootstrap || isLoading) {
    return (
      <main className="portal-page portal-share-design-page">
        <p className="portal-muted">Loading design…</p>
      </main>
    );
  }

  if (!design && (loadError || !initialMeta)) {
    return (
      <main className="portal-page portal-share-design-page">
        <button
          className="portal-catalog-back-link"
          onClick={() => router.push(CATALOG_HOME_PATH)}
          type="button"
        >
          <ArrowLeftIcon />
          Discover
        </button>
        <h1>Design not found</h1>
        <p className="portal-muted">{loadError ?? 'This share link is invalid.'}</p>
        <button
          className="portal-button portal-button-primary"
          onClick={() => router.push(CATALOG_HOME_PATH)}
          type="button"
        >
          Browse designs
        </button>
      </main>
    );
  }

  return (
    <main className="portal-page portal-share-design-page">
      <header className="portal-catalog-topbar">
        <div className="portal-catalog-topbar-copy">
          <button
            className="portal-catalog-back-link"
            onClick={() => router.push(CATALOG_HOME_PATH)}
            type="button"
          >
            <ArrowLeftIcon />
            Discover
          </button>
          <h1>{visibleTitle}</h1>
          {categoryName ? (
            <p className="portal-muted portal-catalog-topbar-subtitle">Category: {categoryName}</p>
          ) : (
            <p className="portal-muted portal-catalog-topbar-subtitle">Design library</p>
          )}
        </div>
      </header>

      <div className="portal-share-design-panel modal-panel-design-details">
        <div
          className="design-details-hero"
          style={{
            ['--color-artwork-preview-bg' as string]: previewBgHex,
            backgroundColor: previewBgHex,
          }}
        >
          {design ? (
            <CatalogThumbnailPanel
              alt={`${visibleTitle} preview`}
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
          ) : initialMeta?.imageUrl ? (
            <img
              alt={initialMeta.imageAlt}
              className="design-details-hero-fallback-image"
              height={630}
              src={initialMeta.imageUrl}
              width={1200}
            />
          ) : null}
        </div>

        <div className="modal-body design-details-body">
          <div className="design-details-toolbar">
            <div className="design-details-toolbar-start">
              {design ? <button className="portal-button portal-button-secondary portal-button-sm" onClick={handleReportIssue} ref={reportTriggerRef} type="button">Report an Issue</button> : null}
              <div className="design-details-toolbar-controls design-details-toolbar-controls-end">
                {design ? (
                  <CatalogArtworkBackgroundPreviewPicker
                    designDefaultHex={designDefaultBgHex}
                    onPreviewHexChange={setPreviewBgHex}
                    previewHex={previewBgHex}
                  />
                ) : null}
                {design ? <CatalogDesignShareButton design={design} variant="labeled" /> : null}
                {design && isAuthenticated ? (
                  <CatalogFavoriteButton
                    className="design-details-favorite-btn"
                    designId={design.id}
                    designTitle={visibleTitle}
                  />
                ) : null}
              </div>
            </div>
            <div className="design-details-primary-action-row">
              {requestFullLabel ? (
                <p className="design-details-request-full-label is-request-full">{requestFullLabel}</p>
              ) : null}
              {isAuthenticated ? (
                <button
                  className="portal-button portal-button-primary portal-button-sm portal-button-leading-icon design-details-add-btn"
                  disabled={!design || addDesignFlow.isAdding || addDesignFlow.isEnsuringWorkingRequest || !addDesignFlow.canAddPrints}
                  onClick={handleAddToRequest}
                  title={requestFullLabel ?? undefined}
                  type="button"
                >
                  <PlusIcon size={14} />
                  {addDesignFlow.isAdding || addDesignFlow.isEnsuringWorkingRequest ? 'Adding…' : 'Add to request'}
                </button>
              ) : (
                <button className="portal-button portal-button-primary portal-button-sm design-details-add-btn" onClick={handleGuestSignIn} type="button">Sign in to add to a request</button>
              )}
            </div>
          </div>

          <section className="design-details-section">
            <h3>Description</h3>
            <p className="design-details-description">{visibleDescription}</p>
          </section>

          <section className="design-details-section">
            <h3>Tags</h3>
            {tags.length > 0 ? (
              <div className="design-details-tags">
                {tags.map((tag) => (
                  <span className="design-details-tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="design-details-description">—</p>
            )}
          </section>

          {addDesignFlow.actionError ? (
            <p className="portal-form-error" role="alert">
              {addDesignFlow.actionError}
            </p>
          ) : null}
        </div>
      </div>

      <CatalogPreviewLightbox
        alt={visibleTitle}
        artworkBackgroundHex={previewBgHex}
        isExplicitContent={design?.isExplicitContent}
        isOpen={isPreviewLightboxOpen}
        onClose={() => setIsPreviewLightboxOpen(false)}
        onReveal={() => setSessionRevealed(true)}
        previewUrl={previewUrl}
        sessionRevealed={sessionRevealed}
      />

      {design ? <CatalogDesignIssueReportModal designId={design.id} isOpen={isReportModalOpen} onClose={() => { setIsReportModalOpen(false); window.requestAnimationFrame(() => reportTriggerRef.current?.focus()); }} /> : null}

      <PortalConfirmModal
        confirmLabel={addDesignFlow.isAdding ? 'Adding…' : 'Add to request'}
        isConfirmLoading={addDesignFlow.isAdding}
        isOpen={addDesignFlow.isConfirmOpen}
        onCancel={addDesignFlow.closeConfirm}
        onConfirm={addDesignFlow.confirmAddDesign}
        title="Add to request?"
      >
        <p className="portal-muted portal-confirm-modal-message">{addDesignFlow.confirmMessage}</p>
      </PortalConfirmModal>

      <PortalPickContinuableRequestModal
        continuableRequests={continuableRequests}
        designTitle={addDesignFlow.pendingDesign?.title}
        isAdding={addDesignFlow.isAdding}
        isOpen={addDesignFlow.isPickerOpen}
        onClose={addDesignFlow.closePicker}
        onSelectRequest={addDesignFlow.confirmPickRequest}
      />
    </main>
  );
}
