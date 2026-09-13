'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import {
  CatalogPreviewLightbox,
  type CatalogPreviewLightboxNavItem,
} from '../../catalog/components/CatalogPreviewLightbox';
import { assistedCreationService } from '../services/assistedCreationService';

export interface AssistedMediaItem {
  id: string;
  storagePath: string;
  fileName?: string;
  contentType?: string;
  note?: string;
  createdAt?: unknown;
}

interface AssistedCreationMediaThumbsProps {
  emptyLabel?: string;
  items: AssistedMediaItem[];
  variant?: 'reference' | 'proof';
}

function resolveAssistedAlt(item: AssistedMediaItem, variant: 'reference' | 'proof'): string {
  return variant === 'proof' ? 'Proof' : item.fileName?.trim() || 'Reference image';
}

export function AssistedCreationMediaThumbs({
  emptyLabel = 'None uploaded.',
  items,
  variant = 'reference',
}: AssistedCreationMediaThumbsProps) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [failedIds, setFailedIds] = useState<Record<string, true>>({});
  const [lightboxActiveId, setLightboxActiveId] = useState<string | null>(null);
  const [canPortal, setCanPortal] = useState(false);

  useEffect(() => {
    setCanPortal(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (items.length === 0) {
        setUrls((previous) => {
          for (const url of Object.values(previous)) {
            if (url.startsWith('blob:')) {
              URL.revokeObjectURL(url);
            }
          }
          return {};
        });
        setFailedIds({});
        return;
      }
      setFailedIds({});
      // Settle each thumb independently so one hung download cannot block the rest.
      await Promise.all(
        items.map(async (item) => {
          try {
            const nextUrl =
              variant === 'proof'
                ? await assistedCreationService.getPreviewObjectUrl(
                    item.storagePath,
                    item.contentType,
                  )
                : await assistedCreationService.getDownloadUrl(item.storagePath);
            if (cancelled) {
              if (nextUrl.startsWith('blob:')) {
                URL.revokeObjectURL(nextUrl);
              }
              return;
            }
            setUrls((previous) => {
              const prior = previous[item.id];
              if (prior?.startsWith('blob:') && prior !== nextUrl) {
                URL.revokeObjectURL(prior);
              }
              return { ...previous, [item.id]: nextUrl };
            });
          } catch {
            if (!cancelled) {
              setFailedIds((previous) => ({ ...previous, [item.id]: true }));
            }
          }
        }),
      );
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [items, variant]);

  const navigationItems = useMemo((): Array<CatalogPreviewLightboxNavItem & { previewUrl: string }> => {
    const next: Array<CatalogPreviewLightboxNavItem & { previewUrl: string } | null> = items.map(
      (item) => {
        const previewUrl = urls[item.id];
        if (!previewUrl) {
          return null;
        }
        return {
          id: item.id,
          alt: resolveAssistedAlt(item, variant),
          previewUrl,
        };
      },
    );
    return next.filter(
      (entry): entry is CatalogPreviewLightboxNavItem & { previewUrl: string } => entry !== null,
    );
  }, [items, urls, variant]);

  const activeLightboxItem =
    lightboxActiveId === null
      ? undefined
      : navigationItems.find((entry) => entry.id === lightboxActiveId);

  if (items.length === 0) {
    return <p className="portal-muted assisted-creation-media-empty">{emptyLabel}</p>;
  }

  const showNavigation = navigationItems.length > 1;

  const lightboxNode = (
    <CatalogPreviewLightbox
      activeItemId={lightboxActiveId}
      alt={activeLightboxItem?.alt ?? 'Preview'}
      className="assisted-creation-lightbox"
      isOpen={lightboxActiveId !== null && Boolean(activeLightboxItem?.previewUrl)}
      navigationItems={showNavigation ? navigationItems : undefined}
      onActiveItemChange={setLightboxActiveId}
      onClose={() => setLightboxActiveId(null)}
      previewUrl={activeLightboxItem?.previewUrl ?? null}
    />
  );

  return (
    <>
      <ul className={`assisted-creation-media-thumbs assisted-creation-media-thumbs--${variant}`}>
        {items.map((item) => {
          const url = urls[item.id];
          const failed = failedIds[item.id] === true;
          const alt = resolveAssistedAlt(item, variant);
          return (
            <li key={item.id}>
              {url ? (
                <button
                  aria-label={`Open ${alt}`}
                  className="assisted-creation-media-thumb"
                  onClick={() => setLightboxActiveId(item.id)}
                  type="button"
                >
                  <img alt={alt} decoding="async" draggable={false} src={url} />
                </button>
              ) : (
                <div
                  className={`assisted-creation-media-thumb ${failed ? '' : 'is-loading'}`}
                  role="status"
                >
                  {failed ? 'Preview unavailable' : 'Loading…'}
                </div>
              )}
              {item.note?.trim() ? (
                <p className="assisted-creation-media-note">{item.note.trim()}</p>
              ) : null}
            </li>
          );
        })}
      </ul>
      {canPortal ? createPortal(lightboxNode, document.body) : lightboxNode}
    </>
  );
}
