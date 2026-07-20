'use client';

import { useEffect } from 'react';

export interface AssistedLibraryListingConsentModalProps {
  isBusy?: boolean;
  isOpen: boolean;
  onAllow: () => void;
  onDecline: () => void;
  onDismiss: () => void;
}

/**
 * Dual-proceed consent before Assisted Add to Request.
 * Allow / Don’t allow both continue the add; Cancel / Escape / overlay dismisses without adding.
 * Maps to the same `catalogUseAcknowledged` field as print-upload attach / donate intake.
 */
export function AssistedLibraryListingConsentModal({
  isBusy = false,
  isOpen,
  onAllow,
  onDecline,
  onDismiss,
}: AssistedLibraryListingConsentModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isBusy) {
        onDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBusy, isOpen, onDismiss]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      aria-labelledby="assisted-library-listing-consent-title"
      aria-modal="true"
      className="modal-overlay modal-overlay-blur"
      onClick={() => {
        if (!isBusy) {
          onDismiss();
        }
      }}
      role="dialog"
    >
      <div
        className="modal-panel portal-confirm-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id="assisted-library-listing-consent-title">Add to Design Library?</h2>
        </header>
        <div className="modal-body">
          <p className="portal-muted portal-confirm-modal-message">
            Allow Fresh Prints to consider this custom design for the public Design Library? Either
            choice still adds it to your Current Request. Staff approves designs first. It will not
            appear in the library automatically.
          </p>
        </div>
        <footer className="modal-footer assisted-library-listing-consent-footer">
          <button
            className="portal-button portal-button-secondary"
            disabled={isBusy}
            onClick={onDismiss}
            type="button"
          >
            Cancel
          </button>
          <div className="assisted-library-listing-consent-actions">
            <button
              className="portal-button portal-button-secondary"
              disabled={isBusy}
              onClick={onDecline}
              type="button"
            >
              Don’t allow
            </button>
            <button
              className="portal-button portal-button-primary"
              disabled={isBusy}
              onClick={onAllow}
              type="button"
            >
              {isBusy ? 'Adding…' : 'Allow'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
