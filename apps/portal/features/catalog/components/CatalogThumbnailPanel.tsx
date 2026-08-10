'use client';

import { useEffect, useState, type CSSProperties, type KeyboardEvent, type MouseEvent } from 'react';

import { resolveArtworkBackgroundHex } from '@fresh-prints/shared/constants/design/artworkBackground.constants';
import { useCatalogDerivativeUrl } from '../hooks/useCatalogDerivativeUrl';
import { useExplicitContentPreference } from '../hooks/useExplicitContentPreference';

interface CatalogThumbnailPanelProps {
  alt: string;
  /** Optional per-design mat color; overrides theme artwork preview bg when set. */
  artworkBackgroundHex?: string;
  catalogPath?: string;
  /** Design updatedAtMs (or similar) so replaced files miss the URL cache. */
  contentVersion?: number;
  className?: string;
  decorative?: boolean;
  fallbackLabel?: string;
  interactive?: boolean;
  /**
   * Staff "Explicit Content" flag from the design doc. When true and the customer hasn't
   * revealed this design (session) or enabled "Show censored content" (global), the
   * thumbnail renders blurred behind a censored overlay.
   * Presentation-only — never affects whether the design is fetched or shown at all.
   */
  isExplicitContent?: boolean;
  loadingLabel?: string;
  onImageClick?: (imageUrl: string) => void;
  /** Called when the customer clicks the reveal overlay. Only used when `revealMode="session"`. */
  onReveal?: () => void;
  prioritizeLoading?: boolean;
  /**
   * "none" (default) — list/selection/matching-designs surfaces. Never offers a reveal
   * action. Overlay shows "Censored Content" + "Click to view" and lets clicks pass through
   * to the parent card so Design Details opens without revealing artwork on the list.
   * "session" — single-design surfaces (Design Details hero, Share page hero) where the
   * caller owns `sessionRevealed` and lifts it so the paired lightbox shares the same
   * one-time reveal gate instead of asking again.
   */
  revealMode?: 'none' | 'session';
  /** Controlled reveal state for `revealMode="session"`. Ignored when `revealMode="none"`. */
  sessionRevealed?: boolean;
}

export function CatalogThumbnailPanel({
  alt,
  artworkBackgroundHex,
  catalogPath,
  contentVersion,
  className = '',
  decorative = false,
  fallbackLabel = 'Preview unavailable',
  interactive = false,
  isExplicitContent = false,
  loadingLabel = 'Loading preview',
  onImageClick,
  onReveal,
  prioritizeLoading = false,
  revealMode = 'none',
  sessionRevealed = false,
}: CatalogThumbnailPanelProps) {
  const { showExplicitContent } = useExplicitContentPreference();
  const { isLoading, url } = useCatalogDerivativeUrl(catalogPath, contentVersion);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const panelStyle: CSSProperties | undefined = artworkBackgroundHex
    ? ({
        ['--color-artwork-preview-bg' as string]: resolveArtworkBackgroundHex(artworkBackgroundHex),
      } as CSSProperties)
    : undefined;

  useEffect(() => {
    setImageLoadFailed(false);
  }, [catalogPath, contentVersion, url]);

  const isRevealGated = revealMode === 'session';
  const hasResolvedUrl = Boolean(url) && !imageLoadFailed;
  const isUnavailable = !catalogPath?.trim() || (!isLoading && !hasResolvedUrl);
  const isCensored = isExplicitContent && !showExplicitContent && !(isRevealGated && sessionRevealed);
  /** List overlay "Click to view" — opens details via onImageClick (never reveals). */
  const canViewFromCensorOverlay =
    !isRevealGated && isCensored && interactive && Boolean(onImageClick) && hasResolvedUrl && Boolean(url);
  const isImageInteractive =
    interactive &&
    Boolean(onImageClick) &&
    hasResolvedUrl &&
    Boolean(url) &&
    !(isRevealGated && isCensored);

  const panelClassName = [
    'design-thumbnail-panel',
    hasResolvedUrl ? 'design-thumbnail-panel--resolved' : '',
    isCensored ? 'design-thumbnail-panel--censored' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const imageClassName = [
    'design-thumbnail-panel-image',
    isImageInteractive ? 'design-thumbnail-panel-image--interactive' : '',
    isCensored ? 'design-thumbnail-panel-image--censored' : '',
  ]
    .filter(Boolean)
    .join(' ');

  function handleImageClick() {
    if (!url || !onImageClick) {
      return;
    }

    onImageClick(url);
  }

  function handleRevealClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    onReveal?.();
  }

  function handleRevealKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onReveal?.();
  }

  function handleViewFromCensorClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    handleImageClick();
  }

  function handleViewFromCensorKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    handleImageClick();
  }

  return (
    <div
      aria-hidden={decorative || undefined}
      aria-label={!decorative && !isUnavailable && !isLoading && !isCensored ? alt : undefined}
      aria-busy={isLoading || undefined}
      className={panelClassName}
      style={panelStyle}
    >
      {hasResolvedUrl && url ? (
        <img
          alt={decorative || isCensored ? '' : alt}
          className={imageClassName}
          decoding="async"
          fetchPriority={prioritizeLoading ? 'high' : undefined}
          loading={prioritizeLoading ? 'eager' : 'lazy'}
          onClick={isImageInteractive ? handleImageClick : undefined}
          onError={() => setImageLoadFailed(true)}
          onKeyDown={
            isImageInteractive
              ? (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleImageClick();
                  }
                }
              : undefined
          }
          role={isImageInteractive ? 'button' : undefined}
          src={url}
          tabIndex={isImageInteractive ? 0 : undefined}
        />
      ) : null}

      {isCensored && hasResolvedUrl ? (
        isRevealGated ? (
          <div
            aria-label={`${alt} — Censored Content. Click to reveal.`}
            className="design-thumbnail-panel-censor-overlay"
            onClick={handleRevealClick}
            onKeyDown={handleRevealKeyDown}
            role="button"
            tabIndex={0}
          >
            <span className="design-thumbnail-panel-censor-overlay-title">Censored Content</span>
            <span className="design-thumbnail-panel-censor-overlay-action">Click to reveal</span>
          </div>
        ) : canViewFromCensorOverlay ? (
          <div
            aria-label={`${alt} — Censored Content. Click to view.`}
            className="design-thumbnail-panel-censor-overlay design-thumbnail-panel-censor-overlay--view"
            onClick={handleViewFromCensorClick}
            onKeyDown={handleViewFromCensorKeyDown}
            role="button"
            tabIndex={0}
          >
            <span className="design-thumbnail-panel-censor-overlay-title">Censored Content</span>
            <span className="design-thumbnail-panel-censor-overlay-action">Click to view</span>
          </div>
        ) : (
          <div
            aria-label={`${alt} — Censored Content. Click to view.`}
            className="design-thumbnail-panel-censor-overlay design-thumbnail-panel-censor-overlay--static"
          >
            <span className="design-thumbnail-panel-censor-overlay-title">Censored Content</span>
            <span className="design-thumbnail-panel-censor-overlay-action">Click to view</span>
          </div>
        )
      ) : null}

      {isLoading ? (
        <div className="design-thumbnail-panel-state">{loadingLabel}</div>
      ) : null}

      {isUnavailable && !isLoading ? (
        <div className="design-thumbnail-panel-state">{fallbackLabel}</div>
      ) : null}
    </div>
  );
}
