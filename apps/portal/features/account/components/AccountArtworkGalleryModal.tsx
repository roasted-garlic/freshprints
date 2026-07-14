'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import type { AccountArtworkKind } from '../../customer-uploads/services/customerUploadService';
import type { AccountArtworkGalleryTile } from '../hooks/useAccountArtworkGallery';

type GalleryFilterTab = 'all' | AccountArtworkKind;

interface AccountArtworkGalleryModalProps {
  isOpen: boolean;
  items: AccountArtworkGalleryTile[];
  onClose: () => void;
  onSelect: (item: AccountArtworkGalleryTile) => void;
}

const GALLERY_TABS: Array<{ id: GalleryFilterTab; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'upload', label: 'Uploaded' },
  { id: 'donation', label: 'Donated' },
];

export function AccountArtworkGalleryModal({
  isOpen,
  items,
  onClose,
  onSelect,
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

  const filteredItems = useMemo(() => {
    if (activeTab === 'all') {
      return items;
    }
    return items.filter((item) => item.kind === activeTab);
  }, [activeTab, items]);

  const tabCounts = useMemo(
    () => ({
      all: items.length,
      upload: items.filter((item) => item.kind === 'upload').length,
      donation: items.filter((item) => item.kind === 'donation').length,
    }),
    [items],
  );

  if (!isOpen) {
    return null;
  }

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
              {filteredItems.length} design{filteredItems.length === 1 ? '' : 's'}
              {activeTab === 'all'
                ? ' from your uploads and donations'
                : activeTab === 'upload'
                  ? ' uploaded'
                  : ' donated'}
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

        {filteredItems.length === 0 ? (
          <p className="portal-muted portal-account-gallery-modal-empty">
            No {activeTab === 'upload' ? 'uploads' : activeTab === 'donation' ? 'donations' : 'designs'}{' '}
            yet.
          </p>
        ) : (
          <div className="portal-account-gallery-modal-grid">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                className="portal-account-gallery-tile"
                onClick={() => onSelect(item)}
                type="button"
              >
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- signed Storage URLs
                  <img alt="" className="portal-account-gallery-tile-image" decoding="async" src={item.imageUrl} />
                ) : null}
                <span className={`portal-account-gallery-tile-badge is-${item.kind}`}>
                  {item.kind === 'donation' ? 'Donated' : 'Upload'}
                </span>
                <span className="portal-account-gallery-tile-title">{item.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
