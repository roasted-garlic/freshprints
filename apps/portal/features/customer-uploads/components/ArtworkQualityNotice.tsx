'use client';

import { ChevronDown, Heart, TriangleAlert } from 'lucide-react';
import { useEffect, useId, useState } from 'react';

import {
  buildArtworkQualityModalSnoozeUntilIso,
  shouldOpenArtworkQualityModalOnMount,
  writeArtworkQualityModalSnoozeUntil,
} from '../utils/artworkQualityModalSnooze';

type ArtworkQualityNoticePurpose = 'print_request' | 'catalog_donation';

interface ArtworkQualityNoticeProps {
  purpose?: ArtworkQualityNoticePurpose;
}

function ArtworkQualityWarningCopy() {
  return (
    <>
      <p className="artwork-quality-notice-text">
        Fresh Prints prints at high quality. Files need to be{' '}
        <strong>professionally designed at 300 DPI</strong> with a{' '}
        <strong>transparent background</strong>. Low-resolution images and screenshots often look
        soft or pixelated when printed.
      </p>
      <p className="artwork-quality-notice-text">
        Do not upload artwork with a solid <strong>white, black, or colored background</strong>.
        Those backgrounds print as a box around the design and must be removed so the file is truly
        transparent before you upload.
      </p>
      <p className="artwork-quality-notice-text">
        If you do not have professional print files yet, get designs from a marketplace like{' '}
        <strong>Etsy</strong> (or a similar source) that sells print-ready graphics. Upload those
        until you have artwork made specifically for print.
      </p>
    </>
  );
}

/**
 * Collapsed inline reminder + visit modal for print-quality guidance
 * on Upload Designs and Donate Designs.
 */
export function ArtworkQualityNotice({ purpose = 'print_request' }: ArtworkQualityNoticeProps) {
  const panelId = useId();
  const snoozeCheckboxId = useId();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [snoozeFor24Hours, setSnoozeFor24Hours] = useState(false);
  const isDonation = purpose === 'catalog_donation';

  useEffect(() => {
    setIsModalOpen(shouldOpenArtworkQualityModalOnMount());
  }, []);

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const dismissModal = (applySnooze: boolean) => {
    if (applySnooze && snoozeFor24Hours) {
      writeArtworkQualityModalSnoozeUntil(buildArtworkQualityModalSnoozeUntilIso(Date.now()));
    }
    setIsModalOpen(false);
  };

  return (
    <>
      <div className="artwork-quality-notice-wrap">
        <button
          aria-controls={panelId}
          aria-expanded={isExpanded}
          className="artwork-quality-notice-toggle"
          onClick={() => setIsExpanded((current) => !current)}
          type="button"
        >
          <span className="artwork-quality-notice-toggle-main">
            <TriangleAlert aria-hidden className="artwork-quality-notice-icon" size={18} strokeWidth={2} />
            <span className="artwork-quality-notice-toggle-label">Print-ready artwork required</span>
          </span>
          <ChevronDown
            aria-hidden
            className={`artwork-quality-notice-chevron${isExpanded ? ' is-expanded' : ''}`}
            size={18}
            strokeWidth={2}
          />
        </button>
        {isExpanded ? (
          <aside className="artwork-quality-notice artwork-quality-notice-expanded" id={panelId} role="note">
            {isDonation ? (
              <p className="artwork-quality-notice-text artwork-quality-notice-thanks">
                Thank you for donating designs — we love you for sharing with Fresh Prints and other
                customers.
              </p>
            ) : null}
            <ArtworkQualityWarningCopy />
          </aside>
        ) : null}
      </div>

      {isModalOpen ? (
        <div
          aria-labelledby="artwork-quality-modal-title"
          aria-modal="true"
          className="modal-overlay modal-overlay-blur"
          onClick={() => dismissModal(false)}
          role="dialog"
        >
          <div
            className="modal-panel portal-confirm-modal artwork-quality-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="modal-header">
              <h2 id="artwork-quality-modal-title">
                {isDonation ? 'Thank you for donating' : 'Artwork requirements'}
              </h2>
            </header>
            <div className="modal-body artwork-quality-modal-body">
              {isDonation ? (
                <div className="artwork-quality-modal-thanks">
                  <Heart
                    aria-hidden
                    className="artwork-quality-modal-heart"
                    fill="currentColor"
                    size={22}
                    strokeWidth={1.75}
                  />
                  <p className="artwork-quality-notice-text artwork-quality-notice-thanks">
                    Thank you for donating designs to Fresh Prints. We love you for helping grow the
                    Design Library for you and other customers — it means a lot.
                  </p>
                </div>
              ) : null}
              <div className="artwork-quality-modal-warning">
                <div aria-hidden className="artwork-quality-notice-icon">
                  <TriangleAlert size={20} strokeWidth={2} />
                </div>
                <div className="artwork-quality-notice-body">
                  {isDonation ? (
                    <h3 className="artwork-quality-notice-title">Artwork requirements</h3>
                  ) : null}
                  <ArtworkQualityWarningCopy />
                </div>
              </div>
            </div>
            <footer className="modal-footer artwork-quality-modal-footer">
              <p className="artwork-quality-modal-confirm-hint">
                By continuing, you confirm your files meet these artwork requirements.
              </p>
              <label className="artwork-quality-modal-snooze" htmlFor={snoozeCheckboxId}>
                <input
                  checked={snoozeFor24Hours}
                  id={snoozeCheckboxId}
                  onChange={(event) => setSnoozeFor24Hours(event.target.checked)}
                  type="checkbox"
                />
                <span>Don&apos;t show this again for 24 hours</span>
              </label>
              <button
                className="portal-button portal-button-primary"
                onClick={() => dismissModal(true)}
                type="button"
              >
                I have the right artwork
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
}
