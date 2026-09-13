'use client';

import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

import { DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG } from '@fresh-prints/shared/constants/gangSheetSectionPricingSettings.constants';
import { GANG_SHEET_PRICING_TIER_ORDER } from '@fresh-prints/shared/utils/gangSheetCustomerSectionSummary';
import { resolveGangSheetPricingForTier } from '@fresh-prints/shared/utils/gangSheetCustomerSectionSummary';
import {
  GANG_SHEET_PRICING_TIER_LABELS,
  GANG_SHEET_PRICING_TIER_SIZE_RANGES,
} from '@fresh-prints/shared/utils/gangSheetPricingTierDisplay';
import { PORTAL_SHOW_PRICE_COMMITMENT_HINT } from '@fresh-prints/shared/utils/portalBiddingAcknowledgmentCopy';

import { formatPortalShowPriceUsd } from '../utils/buildPortalShowPriceCommitmentSummary';

export interface PortalShowSizeTiersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PortalShowSizeTiersModal({ isOpen, onClose }: PortalShowSizeTiersModalProps) {
  const titleId = useId();
  const pricing = DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG;
  const [canPortal, setCanPortal] = useState(false);

  useEffect(() => {
    setCanPortal(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const modal = (
    <div
      aria-labelledby={titleId}
      aria-modal="true"
      className="modal-overlay modal-overlay-blur portal-show-price-commitment-modal-overlay"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="modal-panel portal-show-size-tiers-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <p className="portal-eyebrow">Show pricing</p>
            <h2 id={titleId}>Size tiers</h2>
          </div>
          <button
            aria-label="Close size tiers"
            className="modal-close-button"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden size={18} />
          </button>
        </header>
        <div className="modal-body">
          <p className="portal-muted portal-show-price-commitment-hint">
            {PORTAL_SHOW_PRICE_COMMITMENT_HINT}
          </p>
          <div className="portal-show-size-tiers-table-wrap">
            <table className="portal-show-size-tiers-table">
              <thead>
                <tr>
                  <th scope="col">Tier</th>
                  <th scope="col">Print width</th>
                  <th scope="col">Per print</th>
                </tr>
              </thead>
              <tbody>
                {GANG_SHEET_PRICING_TIER_ORDER.map((tier) => {
                  const tierPricing = resolveGangSheetPricingForTier(pricing, tier);
                  return (
                    <tr key={tier}>
                      <th scope="row">{GANG_SHEET_PRICING_TIER_LABELS[tier]}</th>
                      <td>{GANG_SHEET_PRICING_TIER_SIZE_RANGES[tier]}</td>
                      <td>{formatPortalShowPriceUsd(tierPricing.priceUsd)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <footer className="modal-footer">
          <button className="portal-button portal-button-secondary" onClick={onClose} type="button">
            Close
          </button>
        </footer>
      </div>
    </div>
  );

  // Escape mobile drawer `transform` containing block so the overlay centers on the viewport.
  return canPortal ? createPortal(modal, document.body) : modal;
}
