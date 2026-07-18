'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { CatalogPreviewLightbox } from '../../catalog/components/CatalogPreviewLightbox';
import { assistedCreationService } from '../services/assistedCreationService';

export interface AssistedMediaItem {
  id: string;
  storagePath: string;
  fileName?: string;
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
  const [lightbox, setLightbox] = useState<{ alt: string; url: string } | null>(null);
  const [canPortal, setCanPortal] = useState(false);

  useEffect(() => {
    setCanPortal(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const next: Record<string, string> = {};
      await Promise.all(
        items.map(async (item) => {
          try {
            next[item.id] = await assistedCreationService.getDownloadUrl(item.storagePath);
          } catch {
            // Leave missing; UI shows placeholder.
          }
        }),
      );
      if (!cancelled) {
        setUrls(next);
      }
    }
    if (items.length === 0) {
      setUrls({});
      return;
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [items]);

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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt={alt} decoding="async" src={url} />
                </button>
              ) : (
                <div className="assisted-creation-media-thumb is-loading" role="status">
                  Loading…
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
