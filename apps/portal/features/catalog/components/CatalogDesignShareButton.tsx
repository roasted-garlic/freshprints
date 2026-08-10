'use client';

import { useState } from 'react';

import type { CatalogDesign } from '../types/catalog.types';
import { useExplicitContentPreference } from '../hooks/useExplicitContentPreference';
import { resolvePortalDesignDisplayFields } from '../utils/portalCensoredDesignText';
import { buildPortalDesignShareUrl } from '../utils/portalDesignShareUrls';
import { ShareIcon } from '../../shared/components/PortalIcons';
import { usePortalToast } from '../../shared/context/PortalToastContext';

async function shareDesignLink(
  design: CatalogDesign,
  showExplicitContent: boolean,
): Promise<'shared' | 'copied'> {
  const url = buildPortalDesignShareUrl(design.id);
  const { title } = resolvePortalDesignDisplayFields(design, showExplicitContent);
  // Prefer title + URL so messengers show the link preview (OG title/image) instead of
  // pasting the long description as the only visible content.
  const shareData: ShareData = {
    title,
    text: title,
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
  const { showExplicitContent } = useExplicitContentPreference();
  const { title: displayTitle } = resolvePortalDesignDisplayFields(design, showExplicitContent);

  return (
    <button
      aria-label={`Share ${displayTitle}`}
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
            const result = await shareDesignLink(design, showExplicitContent);
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
