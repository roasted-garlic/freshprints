'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { resolveArtworkBackgroundHex } from '@fresh-prints/shared/constants/design/artworkBackground.constants';

import { useCatalogDerivativeUrl } from '../../catalog/hooks/useCatalogDerivativeUrl';
import type { CatalogDesign } from '../../catalog/types/catalog.types';
import type { AccountArtworkKind } from '../../customer-uploads/services/customerUploadService';
import type { AccountArtworkGalleryTile } from '../hooks/useAccountArtworkGallery';

type GalleryFilterTab = 'all' | AccountArtworkKind | 'reusable';

interface AccountArtworkGalleryModalProps {
  isOpen: boolean;
  items: AccountArtworkGalleryTile[];
  reusableDesigns: CatalogDesign[];
  isReusableLoading: boolean;
  reusableErrorMessage: string | null;
  onClose: () => void;
  onDeletePast: (item: AccountArtworkGalleryTile) => void;
  onSelectPast: (item: AccountArtworkGalleryTile) => void;
  onSelectReusable: (design: CatalogDesign) => void;
}

const GALLERY_TABS: Array<{ id: GalleryFilterTab; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'upload', label: 'Uploaded' },
  { id: 'donation', label: 'Donated' },
  { id: 'reusable', label: 'Reusable' },
];

function ReusableTile({
  design,
  onSelect,
}: {
  design: CatalogDesign;
  onSelect: (design: CatalogDesign) => void;
}) {
  const { url } = useCatalogDerivativeUrl(design.thumbnailPath, design.updatedAtMs);
  const artworkBg = resolveArtworkBackgroundHex(design.artworkBackgroundHex);

  return (
    <button
      className="portal-account-gallery-tile"
      onClick={() => onSelect(design)}
      style={{ backgroundColor: artworkBg }}
      type="button"
    >
      {url ? (
        <img alt="" className="portal-account-gallery-tile-image" decoding="async" src={url} />
      ) : null}
      <span className="portal-account-gallery-tile-badge is-reusable">Catalog</span>
      <span className="portal-account-gallery-tile-title">{design.title}</span>
    </button>
  );
}

export function AccountArtworkGalleryModal({
  isOpen,
  items,
  reusableDesigns,
  isReusableLoading,
  reusableErrorMessage,
  onClose,
  onDeletePast,
  onSelectPast,
  onSelectReusable,
}: AccountArtworkGalleryModalProps) {
  const [activeTab, setActiveTab] = useState<GalleryFilterTab>('all');
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setActiveTab('all');
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredPastItems = useMemo(() => {
    if (activeTab === 'all') {
      return items;
    }
    if (activeTab === 'reusable') {
      return [];
    }
    return items.filter((item) => item.kind === activeTab);
  }, [activeTab, items]);

  const tabCounts = useMemo(
    () => ({
      all: items.length,
      upload: items.filter((item) => item.kind === 'upload').length,
      donation: items.filter((item) => item.kind === 'donation').length,
      reusable: reusableDesigns.length,
    }),
    [items, reusableDesigns.length],
  );

  if (!isOpen) {
    return null;
  }

  const isReusableTab = activeTab === 'reusable';
  const subtitleCount = isReusableTab ? reusableDesigns.length : filteredPastItems.length;
  const subtitleSuffix = isReusableTab
    ? ' reusable from your uploads and donations'
    : activeTab === 'all'
      ? ' from your uploads and donations'
      : activeTab === 'upload'
        ? ' uploaded'
        : ' donated';

  return (
    <div
      aria-label="Your designs gallery"
      aria-modal="true"
      className="modal-overlay modal-overlay-blur portal-account-gallery-modal"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="portal-account-gallery-modal-shell"
        onClick={(event) => event.stopPropagation()}
        role="presentation"
      >
        <header className="portal-account-gallery-modal-header">
          <div>
            <h2 className="portal-account-gallery-modal-title">Your designs</h2>
            <p className="portal-muted portal-account-gallery-modal-subtitle">
              {subtitleCount} design{subtitleCount === 1 ? '' : 's'}
              {subtitleSuffix}
            </p>
          </div>
          <button
            aria-label="Close gallery"
            className="portal-account-gallery-modal-close"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </header>

        <div aria-label="Design filters" className="portal-account-gallery-modal-tabs" role="tablist">
          {GALLERY_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                aria-selected={isActive}
                className={`portal-account-gallery-modal-tab${isActive ? ' is-active' : ''}`}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setActiveTab(tab.id);
                }}
                role="tab"
                type="button"
              >
                {tab.label}
                <span className="portal-account-gallery-modal-tab-count">{tabCounts[tab.id]}</span>
              </button>
            );
          })}
        </div>

        {isReusableTab ? (
          isReusableLoading ? (
            <p className="portal-muted portal-account-gallery-modal-empty">Loading reusable designs…</p>
          ) : reusableErrorMessage ? (
            <p className="portal-muted portal-account-gallery-modal-empty">{reusableErrorMessage}</p>
          ) : reusableDesigns.length === 0 ? (
            <p className="portal-muted portal-account-gallery-modal-empty">
              Uploads and donations that make it into the catalog show up here while they&apos;re still
              available.
            </p>
          ) : (
            <div className="portal-account-gallery-modal-grid">
              {reusableDesigns.map((design) => (
                <ReusableTile key={design.id} design={design} onSelect={onSelectReusable} />
              ))}
            </div>
          )
        ) : filteredPastItems.length === 0 ? (
          <p className="portal-muted portal-account-gallery-modal-empty">
            No {activeTab === 'upload' ? 'uploads' : activeTab === 'donation' ? 'donations' : 'designs'}{' '}
            yet.
          </p>
        ) : (
          <div className="portal-account-gallery-modal-grid">
            {filteredPastItems.map((item) => (
              <div className="portal-account-gallery-tile-wrap" key={item.id}>
                <button
                  className="portal-account-gallery-tile"
                  onClick={() => onSelectPast(item)}
                  type="button"
                >
                  {item.imageUrl ? (
                    <img
                      alt=""
                      className="portal-account-gallery-tile-image"
                      decoding="async"
                      src={item.imageUrl}
                    />
                  ) : null}
                  <span className={`portal-account-gallery-tile-badge is-${item.kind}`}>
                    {item.kind === 'donation' ? 'Donated' : 'Upload'}
                  </span>
                  <span className="portal-account-gallery-tile-title">{item.title}</span>
                </button>
                <button
                  className="portal-account-gallery-tile-delete"
                  onClick={() => onDeletePast(item)}
                  type="button"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
