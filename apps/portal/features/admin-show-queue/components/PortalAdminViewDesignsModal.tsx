'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

import { resolveArtworkBackgroundHex } from '@fresh-prints/shared/constants/design/artworkBackground.constants';
import type { PortalAdminShowQueueRequestDesignsResponse } from '@fresh-prints/shared/types/portal/getPortalAdminShowQueueRequestDesigns.types';
import { resolveGangSheetPriceTierForInches } from '@fresh-prints/shared/utils/gangSheetCustomerSectionSummary';
import { GANG_SHEET_PRICING_TIER_LABELS } from '@fresh-prints/shared/utils/gangSheetPricingTierDisplay';

import {
  CatalogPreviewLightbox,
  type CatalogPreviewLightboxNavItem,
} from '../../catalog/components/CatalogPreviewLightbox';
import { ExplicitContentPreferenceProvider } from '../../catalog/context/ExplicitContentPreferenceProvider';
import { portalAdminShowQueueService } from '../services/portalAdminShowQueueService';

type PreviewableNavItem = CatalogPreviewLightboxNavItem & { previewUrl: string };

function designItemId(index: number): string {
  return `admin-show-queue-design-${index}`;
}

function formatDesignSizeTierLabel(printWidthInches: number | undefined): string | null {
  if (typeof printWidthInches !== 'number' || !Number.isFinite(printWidthInches) || printWidthInches <= 0) {
    return null;
  }
  return GANG_SHEET_PRICING_TIER_LABELS[resolveGangSheetPriceTierForInches(printWidthInches)];
}

function formatDesignSourceLabel(source: 'catalog_design' | 'customer_upload' | 'staff_artwork'): string {
  return source === 'customer_upload'
    ? 'Uploaded'
    : source === 'staff_artwork'
      ? 'Staff-added'
      : 'Design Library';
}

export function PortalAdminViewDesignsModal({
  showId,
  printRequestId,
  requestName,
  onClose,
}: {
  showId: string;
  printRequestId: string;
  requestName: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<PortalAdminShowQueueRequestDesignsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lightboxActiveId, setLightboxActiveId] = useState<string | null>(null);
  const [canPortal, setCanPortal] = useState(false);

  useEffect(() => {
    setCanPortal(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setData(null);
    setLightboxActiveId(null);
    void portalAdminShowQueueService
      .loadRequestDesigns({ showId, printRequestId })
      .then((response) => {
        if (!cancelled) {
          setData(response);
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : 'Unable to load designs.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [showId, printRequestId]);

  const navigationItems = useMemo((): PreviewableNavItem[] => {
    if (!data) {
      return [];
    }
    return data.items.flatMap((item, index) => {
      if (!item.imageUrl) {
        return [];
      }
          return [
            {
              id: designItemId(index),
              alt: formatDesignSourceLabel(item.source),
              previewUrl: item.imageUrl,
              ...(item.artworkBackgroundHex
                ? { artworkBackgroundHex: resolveArtworkBackgroundHex(item.artworkBackgroundHex) }
                : {}),
            },
          ];
    });
  }, [data]);

  const activeLightboxItem =
    lightboxActiveId === null
      ? undefined
      : navigationItems.find((entry) => entry.id === lightboxActiveId);

  const lightboxNode = (
    <ExplicitContentPreferenceProvider>
      <CatalogPreviewLightbox
        activeItemId={lightboxActiveId}
        alt={activeLightboxItem?.alt ?? 'Design preview'}
        artworkBackgroundHex={activeLightboxItem?.artworkBackgroundHex}
        className="portal-admin-design-lightbox"
        isOpen={lightboxActiveId !== null && Boolean(activeLightboxItem?.previewUrl)}
        navigationItems={navigationItems.length > 1 ? navigationItems : undefined}
        onActiveItemChange={setLightboxActiveId}
        onClose={() => setLightboxActiveId(null)}
        previewUrl={activeLightboxItem?.previewUrl ?? null}
      />
    </ExplicitContentPreferenceProvider>
  );

  return (
    <div className="portal-admin-modal-root" role="presentation">
      <button aria-label="Close designs" className="portal-admin-modal-scrim" onClick={onClose} type="button" />
      <div
        aria-labelledby="portal-admin-designs-title"
        aria-modal="true"
        className="portal-admin-modal portal-admin-designs-modal"
        role="dialog"
      >
        <header className="portal-admin-modal-header">
          <div>
            <p className="portal-admin-eyebrow">View Designs</p>
            <h3 id="portal-admin-designs-title">{requestName}</h3>
          </div>
          <button className="portal-button portal-button-secondary" onClick={onClose} type="button">
            Close
          </button>
        </header>
        <div className="portal-admin-modal-body">
          {isLoading ? <p className="portal-admin-loading">Loading designs…</p> : null}
          {error ? (
            <div className="portal-admin-error" role="alert">
              <p>{error}</p>
            </div>
          ) : null}
          {data ? (
            <ul className="portal-admin-design-list">
              {data.items.map((item, index) => {
                const itemId = designItemId(index);
                const canPreview = Boolean(item.imageUrl);
                const thumbStyle: CSSProperties | undefined =
                  item.source === 'catalog_design' && item.artworkBackgroundHex
                    ? ({
                        ['--color-artwork-preview-bg' as string]: resolveArtworkBackgroundHex(
                          item.artworkBackgroundHex,
                        ),
                      } as CSSProperties)
                    : undefined;
                return (
                  <li className="portal-admin-design-card" key={itemId}>
                    <div className="portal-admin-design-thumb" style={thumbStyle}>
                      {canPreview ? (
                        <button
                          aria-label={`Open ${formatDesignSourceLabel(item.source)} preview`}
                          className="portal-admin-design-thumb-button"
                          onClick={() => setLightboxActiveId(itemId)}
                          type="button"
                        >
                          {/* Signed URL is ephemeral and server-authorized for this modal session only. */}
                          <img alt="" src={item.imageUrl} />
                        </button>
                      ) : (
                        <span>No preview</span>
                      )}
                    </div>
                    <div className="portal-admin-design-copy">
                      <strong>{formatDesignSourceLabel(item.source)}</strong>
                      <span>
                        Qty {item.quantity}
                        {item.sizeLabel ? ` · ${item.sizeLabel}` : ''}
                        {item.printWidthInches !== undefined && item.printHeightInches !== undefined
                          ? ` · ${item.printWidthInches}×${item.printHeightInches} in`
                          : ''}
                      </span>
                      <span>
                        {[
                          formatDesignSizeTierLabel(item.printWidthInches),
                          item.origin !== 'standard' ? item.origin : null,
                          item.source === 'customer_upload'
                            ? 'upload'
                            : item.source === 'staff_artwork'
                              ? 'staff'
                              : 'catalog',
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </div>
      {canPortal ? createPortal(lightboxNode, document.body) : lightboxNode}
    </div>
  );
}
