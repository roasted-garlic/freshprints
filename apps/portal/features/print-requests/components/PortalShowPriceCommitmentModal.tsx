'use client';

import { useEffect, useId, useState } from 'react';
import { X } from 'lucide-react';

import type { GangSheetCustomerSectionSummary } from '@fresh-prints/shared/utils/gangSheetCustomerSectionSummary';

import { PortalShowPriceCommitmentBreakdown } from './PortalShowPriceCommitmentBreakdown';
import { PortalShowSizeTiersModal } from './PortalShowSizeTiersModal';

export interface PortalShowPriceCommitmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestName: string;
  summary: GangSheetCustomerSectionSummary;
}

export function PortalShowPriceCommitmentModal({
  isOpen,
  onClose,
  requestName,
  summary,
}: PortalShowPriceCommitmentModalProps) {
  const titleId = useId();
  const [isSizeTiersOpen, setIsSizeTiersOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsSizeTiersOpen(false);
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSizeTiersOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSizeTiersOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="modal-overlay modal-overlay-blur portal-show-price-commitment-modal-overlay"
        onClick={onClose}
        role="dialog"
      >
        <div
          className="modal-panel portal-show-price-commitment-modal"
          onClick={(event) => event.stopPropagation()}
        >
          <header className="modal-header">
            <div>
              <p className="portal-eyebrow">Request totals</p>
              <h2 id={titleId}>Cost and weight — “{requestName}”</h2>
            </div>
            <button
              aria-label="Close show pricing details"
              className="modal-close-button"
              onClick={onClose}
              type="button"
            >
              <X aria-hidden size={18} />
            </button>
          </header>
          <div className="modal-body">
            <PortalShowPriceCommitmentBreakdown summary={summary} />
          </div>
          <footer className="modal-footer portal-show-price-commitment-modal-footer">
            <button
              className="portal-button portal-button-primary"
              onClick={() => setIsSizeTiersOpen(true)}
              type="button"
            >
              Size tiers
            </button>
            <button className="portal-button portal-button-secondary" onClick={onClose} type="button">
              Close
            </button>
          </footer>
        </div>
      </div>

      <PortalShowSizeTiersModal
        isOpen={isSizeTiersOpen}
        onClose={() => setIsSizeTiersOpen(false)}
      />
    </>
  );
}
