'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';
import { Expand, X } from 'lucide-react';

import type { PortalBiddingAcknowledgmentCopy } from '@fresh-prints/shared/utils/portalBiddingAcknowledgmentCopy';
import type { GangSheetCustomerSectionSummary } from '@fresh-prints/shared/utils/gangSheetCustomerSectionSummary';

import { PortalShowPriceCommitmentModal } from '../../print-requests/components/PortalShowPriceCommitmentModal';
import { PortalShowSizeTiersModal } from '../../print-requests/components/PortalShowSizeTiersModal';
import { formatPortalShowPriceUsd } from '../../print-requests/utils/buildPortalShowPriceCommitmentSummary';
import { HoverBubbleTooltip } from './HoverBubbleTooltip';

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
  /** Queue-to-show only: estimated show commitment for remaining prints. */
  priceCommitmentSummary?: GangSheetCustomerSectionSummary | null;
  /** Used as the breakdown modal title. */
  requestName?: string;
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

function AckModalPillButton({
  ariaLabel,
  bubble,
  children,
  disabled,
  onClick,
}: {
  ariaLabel: string;
  bubble: string;
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <HoverBubbleTooltip align="center" bubble={bubble}>
      <button
        aria-haspopup="dialog"
        aria-label={ariaLabel}
        className="portal-request-detail-meta-pill portal-show-price-commitment-total-pill is-button"
        disabled={disabled}
        onClick={onClick}
        type="button"
      >
        {children}
        <Expand aria-hidden size={14} strokeWidth={2.25} />
      </button>
    </HoverBubbleTooltip>
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
  priceCommitmentSummary = null,
  requestName = 'this request',
}: PortalBiddingAcknowledgmentModalProps) {
  const checkboxId = useId();
  const titleId = useId();
  const [accepted, setAccepted] = useState(false);
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [isSizeTiersModalOpen, setIsSizeTiersModalOpen] = useState(false);

  const [introParagraph, totalParagraph, ...restParagraphs] = copy.paragraphs;
  const nestedModalOpen = isPriceModalOpen || isSizeTiersModalOpen;

  useEffect(() => {
    if (!isOpen) {
      setAccepted(false);
      setIsPriceModalOpen(false);
      setIsSizeTiersModalOpen(false);
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isBusy && !nestedModalOpen) {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBusy, isOpen, nestedModalOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  const canConfirm = accepted && !isBusy;

  return (
    <>
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="modal-overlay modal-overlay-blur portal-bidding-ack-overlay"
        onClick={() => {
          if (!isBusy && !nestedModalOpen) {
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
            {introParagraph ? renderAckParagraph(introParagraph) : null}

            <div className="portal-bidding-ack-pricing-actions">
              <AckModalPillButton
                ariaLabel="Open show size tiers"
                bubble="View size tier prices"
                disabled={isBusy}
                onClick={() => setIsSizeTiersModalOpen(true)}
              >
                <span className="portal-show-price-commitment-pill-label">Size tiers</span>
              </AckModalPillButton>
            </div>

            {totalParagraph ? renderAckParagraph(totalParagraph) : null}

            {priceCommitmentSummary ? (
              <div className="portal-bidding-ack-pricing-actions">
                <AckModalPillButton
                  ariaLabel={`Open show pricing details for ${requestName}`}
                  bubble="View show pricing and weight breakdown"
                  disabled={isBusy}
                  onClick={() => setIsPriceModalOpen(true)}
                >
                  <span className="portal-show-price-commitment-pill-label">Show total</span>
                  <strong>
                    {formatPortalShowPriceUsd(priceCommitmentSummary.totalPriceUsd)}
                  </strong>
                </AckModalPillButton>
              </div>
            ) : null}

            {restParagraphs.map((paragraph) => renderAckParagraph(paragraph))}

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

      <PortalShowSizeTiersModal
        isOpen={isSizeTiersModalOpen}
        onClose={() => setIsSizeTiersModalOpen(false)}
      />

      {priceCommitmentSummary ? (
        <PortalShowPriceCommitmentModal
          isOpen={isPriceModalOpen}
          onClose={() => setIsPriceModalOpen(false)}
          requestName={requestName}
          summary={priceCommitmentSummary}
        />
      ) : null}
    </>
  );
}
