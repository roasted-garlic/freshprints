import {
  DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG,
  GANG_SHEET_EXTRA_LONG_MAX_HEIGHT_INCHES,
  GANG_SHEET_LONG_MAX_HEIGHT_INCHES,
  GANG_SHEET_POCKET_MAX_WIDTH_INCHES,
  GANG_SHEET_STANDARD_FULL_SIZE_MAX_WIDTH_INCHES,
  GANG_SHEET_STANDARD_LENGTH_MAX_HEIGHT_INCHES,
  GANG_SHEET_STANDARD_OVERSIZED_MAX_WIDTH_INCHES,
  type GangSheetLengthPricingTier,
  type GangSheetPricingTier,
  type GangSheetSectionPricingConfig,
} from "../constants/gangSheetSectionPricingSettings.constants";

export interface GangSheetSectionSummaryUnitInput {
  printWidthInches: number;
  printHeightInches: number;
  quantity?: number;
}

export type GangSheetTierQuantities = Record<GangSheetPricingTier, number>;
export type GangSheetLengthTierQuantities = Record<GangSheetLengthPricingTier, number>;

export interface GangSheetPriceBreakdown {
  printWidthInches: number;
  printHeightInches: number;
  widthTier: GangSheetPricingTier;
  basePriceUsd: number;
  lengthTier: GangSheetLengthPricingTier;
  lengthSurchargeUsd: number;
  unitPriceUsd: number;
  quantity: number;
  lineTotalUsd: number;
}

export interface GangSheetCustomerSectionSummary {
  tierQuantities: GangSheetTierQuantities;
  lengthTierQuantities: GangSheetLengthTierQuantities;
  priceBreakdowns: GangSheetPriceBreakdown[];
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
  /** Present only when at least one print has a non-zero length surcharge. */
  lengthLine: string | null;
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

export const GANG_SHEET_LENGTH_TIER_ORDER: GangSheetLengthPricingTier[] = [
  "standard_length",
  "long",
  "extra_long",
  "extended",
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

function emptyLengthTierQuantities(): GangSheetLengthTierQuantities {
  return {
    standard_length: 0,
    long: 0,
    extra_long: 0,
    extended: 0,
  };
}

function assertValidDimensions(printWidthInches: number, printHeightInches: number): void {
  if (
    typeof printWidthInches !== "number" ||
    !Number.isFinite(printWidthInches) ||
    printWidthInches <= 0 ||
    typeof printHeightInches !== "number" ||
    !Number.isFinite(printHeightInches) ||
    printHeightInches <= 0
  ) {
    throw new RangeError("Gang sheet pricing requires positive finite print dimensions.");
  }
}

function assertValidQuantity(quantity: number): void {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new RangeError("Gang sheet pricing requires a positive whole-number quantity.");
  }
}

/** Fixed product policy: classify saved width, with height only able to disqualify Pocket. */
export function resolveGangSheetPriceTierForInches(
  printWidthInches: number,
  printHeightInches = printWidthInches,
): GangSheetPricingTier {
  assertValidDimensions(printWidthInches, printHeightInches);
  if (printWidthInches <= GANG_SHEET_POCKET_MAX_WIDTH_INCHES && printHeightInches <= GANG_SHEET_POCKET_MAX_WIDTH_INCHES) {
    return "pocket";
  }
  if (printWidthInches <= GANG_SHEET_STANDARD_FULL_SIZE_MAX_WIDTH_INCHES) return "standard_full_size";
  if (printWidthInches <= GANG_SHEET_STANDARD_OVERSIZED_MAX_WIDTH_INCHES) return "standard_oversized";
  return "extra_oversized";
}

export function resolveGangSheetLengthPricingTierForInches(
  printHeightInches: number,
): GangSheetLengthPricingTier {
  if (typeof printHeightInches !== "number" || !Number.isFinite(printHeightInches) || printHeightInches <= 0) {
    throw new RangeError("Gang sheet pricing requires a positive finite print height.");
  }
  if (printHeightInches <= GANG_SHEET_STANDARD_LENGTH_MAX_HEIGHT_INCHES) return "standard_length";
  if (printHeightInches <= GANG_SHEET_LONG_MAX_HEIGHT_INCHES) return "long";
  if (printHeightInches <= GANG_SHEET_EXTRA_LONG_MAX_HEIGHT_INCHES) return "extra_long";
  return "extended";
}

export function resolveGangSheetLengthSurchargeUsd(
  pricing: GangSheetSectionPricingConfig,
  lengthTier: GangSheetLengthPricingTier,
): number {
  switch (lengthTier) {
    case "standard_length":
      return pricing.lengthSurcharges.standardLengthUsd;
    case "long":
      return pricing.lengthSurcharges.longUsd;
    case "extra_long":
      return pricing.lengthSurcharges.extraLongUsd;
    case "extended":
      return pricing.lengthSurcharges.extendedUsd;
  }
}

export function resolveGangSheetPriceBreakdownForDimensions(
  printWidthInches: number,
  printHeightInches: number,
  pricing: GangSheetSectionPricingConfig = DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG,
  quantity = 1,
): GangSheetPriceBreakdown {
  assertValidDimensions(printWidthInches, printHeightInches);
  assertValidQuantity(quantity);
  const widthTier = resolveGangSheetPriceTierForInches(printWidthInches, printHeightInches);
  const lengthTier = resolveGangSheetLengthPricingTierForInches(printHeightInches);
  const basePriceUsd = resolveGangSheetPricingForTier(pricing, widthTier).priceUsd;
  const lengthSurchargeUsd = resolveGangSheetLengthSurchargeUsd(pricing, lengthTier);
  const unitPriceUsd = roundTwoDecimals(basePriceUsd + lengthSurchargeUsd);
  return {
    printWidthInches,
    printHeightInches,
    widthTier,
    basePriceUsd,
    lengthTier,
    lengthSurchargeUsd,
    unitPriceUsd,
    quantity,
    lineTotalUsd: roundTwoDecimals(unitPriceUsd * quantity),
  };
}

export function buildGangSheetPriceLine(
  tierQuantities: GangSheetTierQuantities,
  pricing: GangSheetSectionPricingConfig,
  _priceBreakdowns: GangSheetPriceBreakdown[] = [],
): string {
  // Width/base tier line only. Length surcharges render on `lengthLine` when charged.
  void _priceBreakdowns;
  const parts = orderGangSheetPricingTiersByPrice(pricing)
    .filter((tier) => tierQuantities[tier] > 0)
    .map((tier) => `${formatUnitPriceUsd(resolveGangSheetPricingForTier(pricing, tier).priceUsd)} x ${tierQuantities[tier]}`);
  if (parts.length === 0) return "Price: $0";
  const total = GANG_SHEET_PRICING_TIER_ORDER.reduce(
    (sum, tier) => sum + tierQuantities[tier] * resolveGangSheetPricingForTier(pricing, tier).priceUsd,
    0,
  );
  return `Price: ${parts.join(" + ")} = ${formatUsd(roundTwoDecimals(total))}`;
}

export function buildGangSheetLengthLine(
  lengthTierQuantities: GangSheetLengthTierQuantities,
  pricing: GangSheetSectionPricingConfig,
): string | null {
  const parts = GANG_SHEET_LENGTH_TIER_ORDER.filter((tier) => {
    const quantity = lengthTierQuantities[tier];
    const surchargeUsd = resolveGangSheetLengthSurchargeUsd(pricing, tier);
    return quantity > 0 && surchargeUsd > 0;
  }).map((tier) => {
    const quantity = lengthTierQuantities[tier];
    const surchargeUsd = resolveGangSheetLengthSurchargeUsd(pricing, tier);
    return `${formatUnitPriceUsd(surchargeUsd)} x ${quantity}`;
  });
  if (parts.length === 0) return null;
  const total = GANG_SHEET_LENGTH_TIER_ORDER.reduce((sum, tier) => {
    return sum + lengthTierQuantities[tier] * resolveGangSheetLengthSurchargeUsd(pricing, tier);
  }, 0);
  return `Length: ${parts.join(" + ")} = ${formatUsd(roundTwoDecimals(total))}`;
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

/** Ordered gang-sheet/customer label lines; omits length when no surcharge is charged. */
export function buildGangSheetCustomerSectionSummaryLines(
  summary: Pick<GangSheetCustomerSectionSummary, "priceLine" | "lengthLine" | "weightLine">,
): string[] {
  return summary.lengthLine
    ? [summary.priceLine, summary.lengthLine, summary.weightLine]
    : [summary.priceLine, summary.weightLine];
}

export function calculateGangSheetCustomerSectionSummary(
  units: GangSheetSectionSummaryUnitInput[],
  pricing: GangSheetSectionPricingConfig = DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG,
): GangSheetCustomerSectionSummary {
  const tierQuantities = emptyTierQuantities();
  const lengthTierQuantities = emptyLengthTierQuantities();
  const priceBreakdowns: GangSheetPriceBreakdown[] = [];

  for (const unit of units) {
    const quantity = unit.quantity ?? 1;
    const breakdown = resolveGangSheetPriceBreakdownForDimensions(
      unit.printWidthInches,
      unit.printHeightInches,
      pricing,
      quantity,
    );
    tierQuantities[breakdown.widthTier] += quantity;
    lengthTierQuantities[breakdown.lengthTier] += quantity;
    priceBreakdowns.push(breakdown);
  }

  const totalQuantity = Object.values(tierQuantities).reduce((sum, quantity) => sum + quantity, 0);
  const totalPriceUsd = roundTwoDecimals(priceBreakdowns.reduce((sum, breakdown) => sum + breakdown.lineTotalUsd, 0));
  const totalWeightOz = roundTwoDecimals(GANG_SHEET_PRICING_TIER_ORDER.reduce(
    (sum, tier) => sum + tierQuantities[tier] * resolveGangSheetPricingForTier(pricing, tier).weightOz,
    0,
  ));
  const priceLine = buildGangSheetPriceLine(tierQuantities, pricing, priceBreakdowns);
  const lengthLine = buildGangSheetLengthLine(lengthTierQuantities, pricing);
  const weightLine = buildGangSheetWeightLine(tierQuantities, pricing);
  const summaryLines = buildGangSheetCustomerSectionSummaryLines({
    priceLine,
    lengthLine,
    weightLine,
  });

  return {
    tierQuantities,
    lengthTierQuantities,
    priceBreakdowns,
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
    lengthLine,
    weightLine,
    combinedLine: summaryLines.join(" | "),
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
