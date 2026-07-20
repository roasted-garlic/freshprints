'use client';

import { useEffect, useId, useState } from 'react';
import { X } from 'lucide-react';

import type { PortalBiddingAcknowledgmentCopy } from '@fresh-prints/shared/utils/portalBiddingAcknowledgmentCopy';

const FUNKY_FRESH_PRINTS_HOST = 'funkyfreshprints.com';
const FUNKY_FRESH_PRINTS_URL = 'https://funkyfreshprints.com';

export interface PortalBiddingAcknowledgmentModalProps {
  cancelLabel?: string;
  confirmLabel: string;
  copy: PortalBiddingAcknowledgmentCopy;
  isBusy?: boolean;
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function renderAckParagraph(paragraph: string) {
  const hostIndex = paragraph.indexOf(FUNKY_FRESH_PRINTS_HOST);
  if (hostIndex < 0) {
    return (
      <p className="portal-muted portal-bidding-ack-paragraph" key={paragraph}>
        {paragraph}
      </p>
    );
  }

  return (
    <p className="portal-muted portal-bidding-ack-exclusive" key={paragraph}>
      {paragraph.slice(0, hostIndex)}
      <a href={FUNKY_FRESH_PRINTS_URL} rel="noopener noreferrer" target="_blank">
        {FUNKY_FRESH_PRINTS_HOST}
      </a>
      {paragraph.slice(hostIndex + FUNKY_FRESH_PRINTS_HOST.length)}
    </p>
  );
}

export function PortalBiddingAcknowledgmentModal({
  cancelLabel = 'Cancel',
  confirmLabel,
  copy,
  isBusy = false,
  isOpen,
  onCancel,
  onConfirm,
}: PortalBiddingAcknowledgmentModalProps) {
  const checkboxId = useId();
  const titleId = useId();
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setAccepted(false);
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isBusy) {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBusy, isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  const canConfirm = accepted && !isBusy;

  return (
    <div
      aria-labelledby={titleId}
      aria-modal="true"
      className="modal-overlay modal-overlay-blur portal-bidding-ack-overlay"
      onClick={() => {
        if (!isBusy) {
          onCancel();
        }
      }}
      role="dialog"
    >
      <div
        className="modal-panel portal-confirm-modal portal-bidding-ack-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id={titleId}>{copy.title}</h2>
          <button
            aria-label="Close"
            className="modal-close-button"
            disabled={isBusy}
            onClick={onCancel}
            type="button"
          >
            <X aria-hidden size={18} />
          </button>
        </header>

        <div className="modal-body portal-bidding-ack-body">
          {copy.paragraphs.map((paragraph) => renderAckParagraph(paragraph))}

          <label className="form-checkbox portal-bidding-ack-checkbox" htmlFor={checkboxId}>
            <input
              checked={accepted}
              disabled={isBusy}
              id={checkboxId}
              onChange={(event) => setAccepted(event.target.checked)}
              type="checkbox"
            />
            <span>{copy.checkboxLabel}</span>
          </label>
        </div>

        <footer className="modal-footer">
          <button
            className="portal-button portal-button-secondary"
            disabled={isBusy}
            onClick={onCancel}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className="portal-button portal-button-primary"
            disabled={!canConfirm}
            onClick={onConfirm}
            type="button"
          >
            {confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
