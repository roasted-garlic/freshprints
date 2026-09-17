import { X } from "lucide-react";

import type {
  GangSheetCustomerSectionSummary,
} from "@fresh-prints/shared/utils/gangSheetCustomerSectionSummary";
import {
  GANG_SHEET_LENGTH_TIER_ORDER,
  orderGangSheetPricingTiersByPrice,
  resolveGangSheetLengthSurchargeUsd,
  resolveGangSheetPricingForTier,
} from "@fresh-prints/shared/utils/gangSheetCustomerSectionSummary";
import type { GangSheetSectionPricingConfig } from "@fresh-prints/shared/constants/gangSheetSectionPricingSettings.constants";
import {
  GANG_SHEET_LENGTH_TIER_LABELS,
  GANG_SHEET_LENGTH_TIER_SIZE_RANGES,
  GANG_SHEET_PRICING_TIER_LABELS,
  GANG_SHEET_PRICING_TIER_SIZE_RANGES,
} from "@fresh-prints/shared/utils/gangSheetPricingTierDisplay";
import { Button } from "../../../shared/components/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";

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
  const lengthRows = GANG_SHEET_LENGTH_TIER_ORDER.filter(
    (tier) => summary.lengthTierQuantities[tier] > 0,
  );

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
            {summary.lengthLine ? (
              <p className="print-request-cost-breakdown-formula">{summary.lengthLine}</p>
            ) : null}
            <p className="print-request-cost-breakdown-formula">{summary.weightLine}</p>
          </section>

          <section className="print-request-cost-breakdown-section">
            <p className="eyebrow">By size tier</p>
            <div className="print-request-cost-breakdown-list">
              {orderGangSheetPricingTiersByPrice(pricing)
                .filter((tier) => summary.tierQuantities[tier] > 0)
                .map((tier) => {
                  const quantity = summary.tierQuantities[tier];
                  const tierPricing = resolveGangSheetPricingForTier(pricing, tier);
                  return (
                    <div className="print-request-cost-breakdown-row" key={tier}>
                      <div>
                        <strong>
                          {GANG_SHEET_PRICING_TIER_LABELS[tier]}{" "}
                          <span className="print-request-cost-breakdown-row-range">
                            ({GANG_SHEET_PRICING_TIER_SIZE_RANGES[tier]})
                          </span>
                        </strong>
                        <span>
                          {quantity} print{quantity === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="print-request-cost-breakdown-row-values">
                        <span>
                          {formatPrice(tierPricing.priceUsd)} × {quantity} ={" "}
                          {formatPrice(tierPricing.priceUsd * quantity)}
                        </span>
                        <span>
                          {formatWeight(tierPricing.weightOz)} × {quantity} ={" "}
                          {formatWeight(tierPricing.weightOz * quantity)}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>

          {lengthRows.length > 0 ? (
            <section className="print-request-cost-breakdown-section">
              <div className="print-request-cost-breakdown-section-heading">
                <p className="eyebrow">By length</p>
                <p className="print-request-cost-breakdown-length-note">
                  additional $ for taller prints
                </p>
              </div>
              <div className="print-request-cost-breakdown-list">
                {lengthRows.map((tier) => {
                  const quantity = summary.lengthTierQuantities[tier];
                  const surcharge = resolveGangSheetLengthSurchargeUsd(pricing, tier);
                  return (
                    <div className="print-request-cost-breakdown-row" key={tier}>
                      <div>
                        <strong>
                          {GANG_SHEET_LENGTH_TIER_LABELS[tier]}{" "}
                          <span className="print-request-cost-breakdown-row-range">
                            ({GANG_SHEET_LENGTH_TIER_SIZE_RANGES[tier]})
                          </span>
                        </strong>
                        <span>
                          {quantity} print{quantity === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="print-request-cost-breakdown-row-values">
                        <span>
                          {formatPrice(surcharge)} × {quantity} = {formatPrice(surcharge * quantity)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}
        </ModalBody>

        <ModalFooter>
          <Button onClick={props.onClose} size="sm" variant="secondary">
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
