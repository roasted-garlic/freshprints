'use client';

import { useEffect, useState } from 'react';

import { useCatalogDerivativeUrl } from '../hooks/useCatalogDerivativeUrl';

interface CatalogThumbnailPanelProps {
  alt: string;
  catalogPath?: string;
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
  catalogPath,
  className = '',
  decorative = false,
  fallbackLabel = 'Preview unavailable',
  interactive = false,
  loadingLabel = 'Loading preview',
  onImageClick,
  prioritizeLoading = false,
}: CatalogThumbnailPanelProps) {
  const { isLoading, url } = useCatalogDerivativeUrl(catalogPath);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  useEffect(() => {
    setImageLoadFailed(false);
  }, [catalogPath, url]);

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
