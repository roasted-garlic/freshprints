'use client';

import { DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG } from '@fresh-prints/shared/constants/gangSheetSectionPricingSettings.constants';
import type { GangSheetCustomerSectionSummary } from '@fresh-prints/shared/utils/gangSheetCustomerSectionSummary';
import {
  orderGangSheetPricingTiersByPrice,
  resolveGangSheetPricingForTier,
} from '@fresh-prints/shared/utils/gangSheetCustomerSectionSummary';
import {
  GANG_SHEET_PRICING_TIER_LABELS,
  GANG_SHEET_PRICING_TIER_SIZE_RANGES,
} from '@fresh-prints/shared/utils/gangSheetPricingTierDisplay';
import { PORTAL_SHOW_PRICE_COMMITMENT_HINT } from '@fresh-prints/shared/utils/portalBiddingAcknowledgmentCopy';

import { formatPortalShowPriceUsd } from '../utils/buildPortalShowPriceCommitmentSummary';

function formatPortalShowWeightOz(amount: number): string {
  return `${amount.toFixed(2)} oz`;
}

export interface PortalShowPriceCommitmentBreakdownProps {
  summary: GangSheetCustomerSectionSummary;
}

/** Shared body for detail modal and Add-to-Show acknowledgment (Studio-like totals + tiers). */
export function PortalShowPriceCommitmentBreakdown({
  summary,
}: PortalShowPriceCommitmentBreakdownProps) {
  const pricing = DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG;
  const tiers = orderGangSheetPricingTiersByPrice(pricing).filter(
    (tier) => summary.tierQuantities[tier] > 0,
  );

  return (
    <div className="portal-show-price-commitment-breakdown">
      <p className="portal-muted portal-show-price-commitment-hint">
        {PORTAL_SHOW_PRICE_COMMITMENT_HINT}
      </p>

      <div className="portal-show-price-commitment-totals">
        <div className="portal-show-price-commitment-total">
          <span>Total price</span>
          <strong>{formatPortalShowPriceUsd(summary.totalPriceUsd)}</strong>
        </div>
        <div className="portal-show-price-commitment-total">
          <span>Total weight</span>
          <strong>{formatPortalShowWeightOz(summary.totalWeightOz)}</strong>
        </div>
      </div>

      <section className="portal-show-price-commitment-section">
        <p className="portal-eyebrow">By size tier</p>
        <div className="portal-show-price-commitment-list">
          {tiers.map((tier) => {
            const quantity = summary.tierQuantities[tier];
            const tierPricing = resolveGangSheetPricingForTier(pricing, tier);
            return (
              <div className="portal-show-price-commitment-row" key={tier}>
                <div>
                  <strong>
                    {GANG_SHEET_PRICING_TIER_LABELS[tier]}{' '}
                    <span className="portal-show-price-commitment-row-range">
                      ({GANG_SHEET_PRICING_TIER_SIZE_RANGES[tier]})
                    </span>
                  </strong>
                  <span>
                    {quantity} print{quantity === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="portal-show-price-commitment-row-values">
                  <span>
                    {formatPortalShowPriceUsd(tierPricing.priceUsd)} × {quantity} ={' '}
                    {formatPortalShowPriceUsd(tierPricing.priceUsd * quantity)}
                  </span>
                  <span>
                    {formatPortalShowWeightOz(tierPricing.weightOz)} × {quantity} ={' '}
                    {formatPortalShowWeightOz(tierPricing.weightOz * quantity)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
