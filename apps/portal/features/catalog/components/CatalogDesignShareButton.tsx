'use client';

import { useState } from 'react';

import type { CatalogDesign } from '../types/catalog.types';
import { buildPortalDesignShareUrl } from '../utils/portalDesignShareUrls';
import { ShareIcon } from '../../shared/components/PortalIcons';
import { usePortalToast } from '../../shared/context/PortalToastContext';

async function shareDesignLink(design: CatalogDesign): Promise<'shared' | 'copied'> {
  const url = buildPortalDesignShareUrl(design.id);
  const shareData: ShareData = {
    title: design.title,
    text: design.description?.trim() || design.title,
    url,
  };

  if (typeof navigator.share === 'function') {
    try {
      await navigator.share(shareData);
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }
    }
  }

  await navigator.clipboard.writeText(url);
  return 'copied';
}

interface CatalogDesignShareButtonProps {
  design: CatalogDesign;
  /** Icon-only for cards; labeled for the details modal. */
  variant?: 'icon' | 'labeled';
  className?: string;
}

export function CatalogDesignShareButton({
  design,
  variant = 'icon',
  className = '',
}: CatalogDesignShareButtonProps) {
  const [isSharing, setIsSharing] = useState(false);
  const { showSuccess, showError } = usePortalToast();

  return (
    <button
      aria-label={`Share ${design.title}`}
      className={
        variant === 'labeled'
          ? `portal-button portal-button-secondary portal-button-sm portal-button-leading-icon design-details-share-btn ${className}`.trim()
          : `design-selection-card-share-btn ${className}`.trim()
      }
      disabled={isSharing}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void (async () => {
          setIsSharing(true);
          try {
            const result = await shareDesignLink(design);
            if (result === 'copied') {
              showSuccess('Link copied');
            }
          } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
              return;
            }
            showError('Unable to share — try again');
          } finally {
            setIsSharing(false);
          }
        })();
      }}
      title="Share"
      type="button"
    >
      <ShareIcon size={variant === 'labeled' ? 14 : 16} />
      {variant === 'labeled' ? (isSharing ? 'Sharing…' : 'Share') : null}
    </button>
  );
}
