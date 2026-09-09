import { X } from "lucide-react";

import type {
  GangSheetCustomerSectionSummary,
} from "@fresh-prints/shared/utils/gangSheetCustomerSectionSummary";
import {
  orderGangSheetPricingTiersByPrice,
  resolveGangSheetPricingForTier,
} from "@fresh-prints/shared/utils/gangSheetCustomerSectionSummary";
import type { GangSheetPricingTier, GangSheetSectionPricingConfig } from "@fresh-prints/shared/constants/gangSheetSectionPricingSettings.constants";
import { Button } from "../../../shared/components/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";

const TIER_LABELS: Record<GangSheetPricingTier, string> = {
  pocket: "Pocket",
  standard_full_size: "Standard Full Size",
  standard_oversized: "Standard Oversized",
  extra_oversized: "Extra Oversized",
};

const TIER_SIZE_RANGES: Record<GangSheetPricingTier, string> = {
  pocket: '4" and under',
  standard_full_size: 'over 4" through 11"',
  standard_oversized: 'over 11" through 14"',
  extra_oversized: 'over 14"',
};

function formatPrice(amount: number): string {
  return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
}

function formatWeight(amount: number): string {
  return `${amount.toFixed(2)} oz`;
}

export function PrintRequestCostBreakdownModal(props: {
  requestName: string;
  summary: GangSheetCustomerSectionSummary;
  pricing: GangSheetSectionPricingConfig;
  onClose: () => void;
}) {
  const { pricing, summary } = props;

  return (
    <div className="modal-overlay modal-overlay-blur">
      <Modal
        aria-labelledby="print-request-cost-breakdown-title"
        className="modal-panel print-request-cost-breakdown-modal"
        role="dialog"
      >
        <ModalHeader>
          <div>
            <p className="eyebrow">Request totals</p>
            <h3 id="print-request-cost-breakdown-title">Cost and weight — “{props.requestName}”</h3>
          </div>
          <button
            aria-label="Close cost and weight breakdown"
            className="icon-button icon-button-md icon-button-ghost"
            onClick={props.onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </ModalHeader>

        <ModalBody>
          <div className="print-request-cost-breakdown-totals">
            <div className="print-request-cost-breakdown-total">
              <span>Total price</span>
              <strong>{formatPrice(summary.totalPriceUsd)}</strong>
            </div>
            <div className="print-request-cost-breakdown-total">
              <span>Total weight</span>
              <strong>{formatWeight(summary.totalWeightOz)}</strong>
            </div>
          </div>

          <section className="print-request-cost-breakdown-section">
            <p className="eyebrow">Calculation</p>
            <p className="print-request-cost-breakdown-formula">{summary.priceLine}</p>
            <p className="print-request-cost-breakdown-formula">{summary.weightLine}</p>
          </section>

          <section className="print-request-cost-breakdown-section">
            <p className="eyebrow">By size tier</p>
            <div className="print-request-cost-breakdown-list">
              {orderGangSheetPricingTiersByPrice(pricing).filter((tier) => summary.tierQuantities[tier] > 0).map((tier) => {
                const quantity = summary.tierQuantities[tier];
                const tierPricing = resolveGangSheetPricingForTier(pricing, tier);
                return (
                  <div className="print-request-cost-breakdown-row" key={tier}>
                    <div>
                      <strong>
                        {TIER_LABELS[tier]}{" "}
                        <span className="print-request-cost-breakdown-row-range">
                          ({TIER_SIZE_RANGES[tier]})
                        </span>
                      </strong>
                      <span>{quantity} print{quantity === 1 ? "" : "s"}</span>
                    </div>
                    <div className="print-request-cost-breakdown-row-values">
                      <span>{formatPrice(tierPricing.priceUsd)} × {quantity} = {formatPrice(tierPricing.priceUsd * quantity)}</span>
                      <span>{formatWeight(tierPricing.weightOz)} × {quantity} = {formatWeight(tierPricing.weightOz * quantity)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </ModalBody>

        <ModalFooter>
          <Button onClick={props.onClose} size="sm" variant="secondary">Close</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
