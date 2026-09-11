'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { resolveArtworkBackgroundHex } from '@fresh-prints/shared/constants/design/artworkBackground.constants';

import { useCatalogDerivativeUrl } from '../../catalog/hooks/useCatalogDerivativeUrl';
import type { CatalogDesign } from '../../catalog/types/catalog.types';
import type { AccountArtworkGalleryTile } from '../hooks/useAccountArtworkGallery';
import {
  type AccountArtworkGalleryPastTab,
  type AccountArtworkGalleryTab,
  canCustomerDeleteAccountArtworkTile,
  getAccountArtworkGalleryPastTab,
} from '../utils/accountArtworkGalleryTabs';

interface AccountArtworkGalleryModalProps {
  isOpen: boolean;
  /** When a nested modal (e.g. design details) is open, Escape closes that layer only. */
  suppressEscapeClose?: boolean;
  items: AccountArtworkGalleryTile[];
  reusableDesigns: CatalogDesign[];
  isReusableLoading: boolean;
  reusableErrorMessage: string | null;
  onClose: () => void;
  onAddPast: (item: AccountArtworkGalleryTile) => void;
  onDeletePast: (item: AccountArtworkGalleryTile) => void;
  onSelectPast: (
    item: AccountArtworkGalleryTile,
    filteredPastItems: readonly AccountArtworkGalleryTile[],
  ) => void;
  onSelectReusable: (design: CatalogDesign) => void;
}

const GALLERY_TABS: Array<{ id: AccountArtworkGalleryTab; label: string }> = [
  { id: 'personal', label: 'Personal' },
  { id: 'uploaded', label: 'Uploaded' },
  { id: 'donated', label: 'Donated' },
  { id: 'library', label: 'Design Library' },
];

const PAST_TAB_COPY: Record<
  AccountArtworkGalleryPastTab,
  { empty: string; subtitleSuffix: string; hint: string }
> = {
  personal: {
    empty:
      'Don’t-allow designs show here for personal reuse. They stay about 30 days when nothing is still queued for a show.',
    subtitleSuffix: ' kept personal (no Design Library permission)',
    hint: 'Kept about 30 days for reuse, then removed if nothing is still queued for a show.',
  },
  uploaded: {
    empty:
      'Uploads waiting to be added to the Design Library show here. They leave this tab after staff promote them.',
    subtitleSuffix: ' waiting to be added to the Design Library',
    hint: 'Designs will leave this tab after staff add them to the Design Library.',
  },
  donated: {
    empty: 'Donated designs show here until staff promote them into the Design Library.',
    subtitleSuffix: ' donated and waiting for the Design Library',
    hint: 'Kept about 30 days; move to Design Library once accepted, or removed if not promoted.',
  },
};

const LIBRARY_TAB_HINT =
  'Promoted designs stay here for reuse on future requests.';

function pastTabBadge(item: AccountArtworkGalleryTile): { className: string; label: string } {
  const tab = getAccountArtworkGalleryPastTab(item);
  if (tab === 'personal') {
    return { className: ' is-personal', label: 'Personal' };
  }
  if (tab === 'donated') {
    return { className: ' is-donation', label: 'Donated' };
  }
  return { className: ' is-upload', label: 'Upload' };
}

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
  suppressEscapeClose = false,
  items,
  reusableDesigns,
  isReusableLoading,
  reusableErrorMessage,
  onClose,
  onAddPast,
  onDeletePast,
  onSelectPast,
  onSelectReusable,
}: AccountArtworkGalleryModalProps) {
  const [activeTab, setActiveTab] = useState<AccountArtworkGalleryTab>('personal');
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setActiveTab('personal');
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || suppressEscapeClose) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, suppressEscapeClose]);

  const personalItems = useMemo(
    () => items.filter((item) => getAccountArtworkGalleryPastTab(item) === 'personal'),
    [items],
  );
  const uploadedItems = useMemo(
    () => items.filter((item) => getAccountArtworkGalleryPastTab(item) === 'uploaded'),
    [items],
  );
  const donatedItems = useMemo(
    () => items.filter((item) => getAccountArtworkGalleryPastTab(item) === 'donated'),
    [items],
  );

  const tabCounts = useMemo(
    () => ({
      personal: personalItems.length,
      uploaded: uploadedItems.length,
      donated: donatedItems.length,
      library: reusableDesigns.length,
    }),
    [donatedItems.length, personalItems.length, reusableDesigns.length, uploadedItems.length],
  );

  if (!isOpen) {
    return null;
  }

  const isLibraryTab = activeTab === 'library';
  const pastItems =
    activeTab === 'personal'
      ? personalItems
      : activeTab === 'uploaded'
        ? uploadedItems
        : activeTab === 'donated'
          ? donatedItems
          : [];
  const subtitleCount = isLibraryTab ? reusableDesigns.length : pastItems.length;
  const subtitleSuffix = isLibraryTab
    ? ' in the Design Library (promoted designs you can reuse)'
    : PAST_TAB_COPY[activeTab].subtitleSuffix;
  const tabHint = isLibraryTab ? LIBRARY_TAB_HINT : PAST_TAB_COPY[activeTab].hint;

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
            <p className="portal-muted portal-account-gallery-modal-hint">{tabHint}</p>
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

        {isLibraryTab ? (
          isReusableLoading ? (
            <p className="portal-muted portal-account-gallery-modal-empty">
              Loading Design Library designs…
            </p>
          ) : reusableErrorMessage ? (
            <p className="portal-muted portal-account-gallery-modal-empty">{reusableErrorMessage}</p>
          ) : reusableDesigns.length === 0 ? (
            <p className="portal-muted portal-account-gallery-modal-empty">
              Allowing Design Library use does not put art here immediately. Designs appear after staff
              promote them into the catalog.
            </p>
          ) : (
            <div className="portal-account-gallery-modal-grid">
              {reusableDesigns.map((design) => (
                <ReusableTile key={design.id} design={design} onSelect={onSelectReusable} />
              ))}
            </div>
          )
        ) : pastItems.length === 0 ? (
          <p className="portal-muted portal-account-gallery-modal-empty">
            {PAST_TAB_COPY[activeTab].empty}
          </p>
        ) : (
          <div className="portal-account-gallery-modal-grid">
            {pastItems.map((item) => {
              const badge = pastTabBadge(item);
              return (
                <div className="portal-account-gallery-tile-wrap" key={item.id}>
                  <button
                    className="portal-account-gallery-tile"
                    onClick={() => onSelectPast(item, pastItems)}
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
                    <span className={`portal-account-gallery-tile-badge${badge.className}`}>
                      {badge.label}
                    </span>
                    <span className="portal-account-gallery-tile-title">{item.title}</span>
                  </button>
                  <div className="portal-account-gallery-tile-actions">
                    <button
                      className="portal-account-gallery-tile-add"
                      onClick={() => onAddPast(item)}
                      type="button"
                    >
                      Add to request
                    </button>
                    {canCustomerDeleteAccountArtworkTile(item) ? (
                      <button
                        className="portal-account-gallery-tile-delete"
                        onClick={() => onDeletePast(item)}
                        type="button"
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
