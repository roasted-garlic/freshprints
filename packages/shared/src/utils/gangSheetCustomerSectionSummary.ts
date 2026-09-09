import {
  DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG,
  type GangSheetPricingTier,
  type GangSheetSectionPricingConfig,
} from "../constants/gangSheetSectionPricingSettings.constants";

export interface GangSheetSectionSummaryUnitInput {
  printWidthInches: number;
  /** Retained for the shared image contract; pricing intentionally ignores height. */
  printHeightInches: number;
  quantity?: number;
}

export type GangSheetTierQuantities = Record<GangSheetPricingTier, number>;

export interface GangSheetCustomerSectionSummary {
  tierQuantities: GangSheetTierQuantities;
  /** Compatibility aliases for existing operational cards/tests. */
  smallTierQuantity: number;
  largeTierQuantity: number;
  standardFullSizeQuantity: number;
  standardOversizedQuantity: number;
  extraOversizedQuantity: number;
  totalQuantity: number;
  totalPriceUsd: number;
  totalWeightOz: number;
  priceLine: string;
  weightLine: string;
  combinedLine: string;
}

/** Display and calculation order follows the customer-facing price ladder. */
export const GANG_SHEET_PRICING_TIER_ORDER: GangSheetPricingTier[] = [
  "pocket",
  "standard_full_size",
  "standard_oversized",
  "extra_oversized",
];

export function resolveGangSheetPricingForTier(
  pricing: GangSheetSectionPricingConfig,
  tier: GangSheetPricingTier,
) {
  switch (tier) {
    case "pocket":
      return pricing.pocket;
    case "standard_full_size":
      return pricing.standardFullSize;
    case "standard_oversized":
      return pricing.standardOversized;
    case "extra_oversized":
      return pricing.extraOversized;
  }
}

/** Orders the visible breakdown by the configured per-print dollar amount. */
export function orderGangSheetPricingTiersByPrice(
  pricing: GangSheetSectionPricingConfig,
): GangSheetPricingTier[] {
  return [...GANG_SHEET_PRICING_TIER_ORDER].sort((left, right) => {
    const priceDifference =
      resolveGangSheetPricingForTier(pricing, left).priceUsd -
      resolveGangSheetPricingForTier(pricing, right).priceUsd;
    if (priceDifference !== 0) {
      return priceDifference;
    }
    return GANG_SHEET_PRICING_TIER_ORDER.indexOf(left) - GANG_SHEET_PRICING_TIER_ORDER.indexOf(right);
  });
}

function formatUsd(amount: number): string {
  return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
}

function formatUnitPriceUsd(amount: number): string {
  if (Number.isInteger(amount)) {
    return `$${amount}`;
  }
  return `$${amount.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}`;
}

function formatWeightOz(amount: number): string {
  return Number.isInteger(amount) ? `${amount} oz` : `${amount.toFixed(2).replace(/\.?0+$/, "")} oz`;
}

function formatUnitWeightOz(amount: number): string {
  return Number.isInteger(amount) ? `${amount}oz` : `${amount.toFixed(2)}oz`;
}

function roundTwoDecimals(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function emptyTierQuantities(): GangSheetTierQuantities {
  return {
    pocket: 0,
    standard_full_size: 0,
    standard_oversized: 0,
    extra_oversized: 0,
  };
}

function assertValidPrintWidth(printWidthInches: number): void {
  if (typeof printWidthInches !== "number" || !Number.isFinite(printWidthInches) || printWidthInches <= 0) {
    throw new RangeError("Gang sheet pricing requires a positive finite print width.");
  }
}

/** Fixed product policy: classify saved print width only. */
export function resolveGangSheetPriceTierForInches(printWidthInches: number): GangSheetPricingTier {
  assertValidPrintWidth(printWidthInches);
  if (printWidthInches <= 4) return "pocket";
  if (printWidthInches <= 11) return "standard_full_size";
  if (printWidthInches <= 14) return "standard_oversized";
  return "extra_oversized";
}

export function buildGangSheetPriceLine(
  tierQuantities: GangSheetTierQuantities,
  pricing: GangSheetSectionPricingConfig,
): string {
  const parts = orderGangSheetPricingTiersByPrice(pricing)
    .filter((tier) => tierQuantities[tier] > 0)
    .map((tier) => `${formatUnitPriceUsd(resolveGangSheetPricingForTier(pricing, tier).priceUsd)} x ${tierQuantities[tier]}`);
  if (parts.length === 0) return "Price: $0";
  const total = GANG_SHEET_PRICING_TIER_ORDER.reduce(
    (sum, tier) => sum + tierQuantities[tier] * resolveGangSheetPricingForTier(pricing, tier).priceUsd,
    0,
  );
  return `Price: ${parts.join(" + ")} = ${formatUsd(total)}`;
}

export function buildGangSheetWeightLine(
  tierQuantities: GangSheetTierQuantities,
  pricing: GangSheetSectionPricingConfig,
): string {
  const parts = orderGangSheetPricingTiersByPrice(pricing)
    .filter((tier) => tierQuantities[tier] > 0)
    .map((tier) => `${formatUnitWeightOz(resolveGangSheetPricingForTier(pricing, tier).weightOz)} x ${tierQuantities[tier]}`);
  if (parts.length === 0) return "Weight: 0 oz";
  const total = GANG_SHEET_PRICING_TIER_ORDER.reduce(
    (sum, tier) => sum + tierQuantities[tier] * resolveGangSheetPricingForTier(pricing, tier).weightOz,
    0,
  );
  return `Weight: ${parts.join(" + ")} = ${formatWeightOz(total)}`;
}

export function calculateGangSheetCustomerSectionSummary(
  units: GangSheetSectionSummaryUnitInput[],
  pricing: GangSheetSectionPricingConfig = DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG,
): GangSheetCustomerSectionSummary {
  const tierQuantities = emptyTierQuantities();

  for (const unit of units) {
    const quantity = unit.quantity ?? 1;
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new RangeError("Gang sheet pricing requires a positive whole-number quantity.");
    }
    const tier = resolveGangSheetPriceTierForInches(unit.printWidthInches);
    tierQuantities[tier] += quantity;
  }

  const totalQuantity = Object.values(tierQuantities).reduce((sum, quantity) => sum + quantity, 0);
  const totalPriceUsd = roundTwoDecimals(GANG_SHEET_PRICING_TIER_ORDER.reduce(
    (sum, tier) => sum + tierQuantities[tier] * resolveGangSheetPricingForTier(pricing, tier).priceUsd,
    0,
  ));
  const totalWeightOz = roundTwoDecimals(GANG_SHEET_PRICING_TIER_ORDER.reduce(
    (sum, tier) => sum + tierQuantities[tier] * resolveGangSheetPricingForTier(pricing, tier).weightOz,
    0,
  ));
  const priceLine = buildGangSheetPriceLine(tierQuantities, pricing);
  const weightLine = buildGangSheetWeightLine(tierQuantities, pricing);

  return {
    tierQuantities,
    smallTierQuantity: tierQuantities.pocket,
    largeTierQuantity:
      tierQuantities.standard_full_size + tierQuantities.standard_oversized + tierQuantities.extra_oversized,
    standardFullSizeQuantity: tierQuantities.standard_full_size,
    standardOversizedQuantity: tierQuantities.standard_oversized,
    extraOversizedQuantity: tierQuantities.extra_oversized,
    totalQuantity,
    totalPriceUsd,
    totalWeightOz,
    priceLine,
    weightLine,
    combinedLine: `${priceLine} | ${weightLine}`,
  };
}

export interface GangSheetSectionPlacementImageView {
  id: string;
  printWidthInches: number;
  printHeightInches: number;
}

export function calculateGangSheetSectionSummaryForPlacements(
  placements: Array<{ id: string }>,
  imagesById: Map<string, GangSheetSectionPlacementImageView>,
  pricing: GangSheetSectionPricingConfig = DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG,
): GangSheetCustomerSectionSummary {
  const units: GangSheetSectionSummaryUnitInput[] = [];
  for (const placement of placements) {
    const image = imagesById.get(placement.id);
    if (!image) continue;
    units.push({
      printWidthInches: image.printWidthInches,
      printHeightInches: image.printHeightInches,
    });
  }
  return calculateGangSheetCustomerSectionSummary(units, pricing);
}
