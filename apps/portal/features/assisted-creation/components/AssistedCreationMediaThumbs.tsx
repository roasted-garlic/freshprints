'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { CatalogPreviewLightbox } from '../../catalog/components/CatalogPreviewLightbox';
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

export function AssistedCreationMediaThumbs({
  emptyLabel = 'None uploaded.',
  items,
  variant = 'reference',
}: AssistedCreationMediaThumbsProps) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [failedIds, setFailedIds] = useState<Record<string, true>>({});
  const [lightbox, setLightbox] = useState<{ alt: string; url: string } | null>(null);
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

  if (items.length === 0) {
    return <p className="portal-muted assisted-creation-media-empty">{emptyLabel}</p>;
  }

  const lightboxNode = (
    <CatalogPreviewLightbox
      alt={lightbox?.alt ?? 'Preview'}
      className="assisted-creation-lightbox"
      isOpen={lightbox !== null}
      onClose={() => setLightbox(null)}
      previewUrl={lightbox?.url ?? null}
    />
  );

  return (
    <>
      <ul className={`assisted-creation-media-thumbs assisted-creation-media-thumbs--${variant}`}>
        {items.map((item) => {
          const url = urls[item.id];
          const failed = failedIds[item.id] === true;
          // Do not surface original proof filenames to customers.
          const alt =
            variant === 'proof' ? 'Proof' : item.fileName?.trim() || 'Reference image';
          return (
            <li key={item.id}>
              {url ? (
                <button
                  aria-label={`Open ${alt}`}
                  className="assisted-creation-media-thumb"
                  onClick={() => setLightbox({ alt, url })}
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
