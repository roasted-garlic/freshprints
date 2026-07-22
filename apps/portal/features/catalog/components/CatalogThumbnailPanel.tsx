'use client';

import { useEffect, useState, type CSSProperties } from 'react';

import { resolveArtworkBackgroundHex } from '@fresh-prints/shared/constants/design/artworkBackground.constants';
import { useCatalogDerivativeUrl } from '../hooks/useCatalogDerivativeUrl';

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
  loadingLabel?: string;
  onImageClick?: (imageUrl: string) => void;
  prioritizeLoading?: boolean;
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
  loadingLabel = 'Loading preview',
  onImageClick,
  prioritizeLoading = false,
}: CatalogThumbnailPanelProps) {
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

  const hasResolvedUrl = Boolean(url) && !imageLoadFailed;
  const isUnavailable = !catalogPath?.trim() || (!isLoading && !hasResolvedUrl);
  const isImageInteractive = interactive && Boolean(onImageClick) && hasResolvedUrl && Boolean(url);

  const panelClassName = [
    'design-thumbnail-panel',
    hasResolvedUrl ? 'design-thumbnail-panel--resolved' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const imageClassName = [
    'design-thumbnail-panel-image',
    isImageInteractive ? 'design-thumbnail-panel-image--interactive' : '',
  ]
    .filter(Boolean)
    .join(' ');

  function handleImageClick() {
    if (!url || !onImageClick) {
      return;
    }

    onImageClick(url);
  }

  return (
    <div
      aria-hidden={decorative || undefined}
      aria-label={!decorative && !isUnavailable && !isLoading ? alt : undefined}
      aria-busy={isLoading || undefined}
      className={panelClassName}
      style={panelStyle}
    >
      {hasResolvedUrl && url ? (
        <img
          alt={decorative ? '' : alt}
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

      {isLoading ? (
        <div className="design-thumbnail-panel-state">{loadingLabel}</div>
      ) : null}

      {isUnavailable && !isLoading ? (
        <div className="design-thumbnail-panel-state">{fallbackLabel}</div>
      ) : null}
    </div>
  );
}
