import {
  DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG,
  type GangSheetSectionPricingConfig,
} from "../constants/gangSheetSectionPricingSettings.constants";

export interface GangSheetSectionSummaryUnitInput {
  printWidthInches: number;
  printHeightInches: number;
}

export interface GangSheetCustomerSectionSummary {
  smallTierQuantity: number;
  largeTierQuantity: number;
  totalQuantity: number;
  totalPriceUsd: number;
  totalWeightOz: number;
  priceLine: string;
  weightLine: string;
  combinedLine: string;
}

function isLargeTier(
  printWidthInches: number,
  printHeightInches: number,
  sizeCutoffInches: number,
): boolean {
  return printWidthInches > sizeCutoffInches || printHeightInches > sizeCutoffInches;
}

function formatUsd(amount: number): string {
  if (Number.isInteger(amount)) {
    return `$${amount}`;
  }
  return `$${amount.toFixed(2)}`;
}

function formatUnitPriceUsd(amount: number): string {
  if (Number.isInteger(amount)) {
    return `$${amount}`;
  }
  const trimmed = amount.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return `$${trimmed}`;
}

function formatWeightOz(amount: number): string {
  if (Number.isInteger(amount)) {
    return `${amount} oz`;
  }
  const trimmed = amount.toFixed(2).replace(/\.?0+$/, "");
  return `${trimmed} oz`;
}

function formatUnitWeightOz(amount: number): string {
  if (Number.isInteger(amount)) {
    return `${amount}oz`;
  }
  return `${amount.toFixed(2)}oz`;
}

export function buildGangSheetPriceLine(
  smallTierQuantity: number,
  largeTierQuantity: number,
  pricing: Pick<GangSheetSectionPricingConfig, "smallTierPriceUsd" | "largeTierPriceUsd">,
): string {
  const parts: string[] = [];

  if (largeTierQuantity > 0) {
    parts.push(`${formatUnitPriceUsd(pricing.largeTierPriceUsd)} x ${largeTierQuantity}`);
  }
  if (smallTierQuantity > 0) {
    parts.push(`${formatUnitPriceUsd(pricing.smallTierPriceUsd)} x ${smallTierQuantity}`);
  }

  if (parts.length === 0) {
    return "$0";
  }

  const total =
    smallTierQuantity * pricing.smallTierPriceUsd + largeTierQuantity * pricing.largeTierPriceUsd;

  if (parts.length === 1) {
    return `${parts[0]} = ${formatUsd(total)}`;
  }

  return `${parts.join(" + ")} = ${formatUsd(total)}`;
}

export function buildGangSheetWeightLine(
  smallTierQuantity: number,
  largeTierQuantity: number,
  pricing: Pick<GangSheetSectionPricingConfig, "smallTierWeightOz" | "largeTierWeightOz">,
): string {
  const parts: string[] = [];

  if (largeTierQuantity > 0) {
    parts.push(`${formatUnitWeightOz(pricing.largeTierWeightOz)} x ${largeTierQuantity}`);
  }
  if (smallTierQuantity > 0) {
    parts.push(`${formatUnitWeightOz(pricing.smallTierWeightOz)} x ${smallTierQuantity}`);
  }

  if (parts.length === 0) {
    return "Weight: 0 oz";
  }

  const totalWeightOz =
    smallTierQuantity * pricing.smallTierWeightOz + largeTierQuantity * pricing.largeTierWeightOz;

  if (parts.length === 1) {
    return `Weight: ${parts[0]} = ${formatWeightOz(totalWeightOz)}`;
  }

  return `Weight: ${parts.join(" + ")} = ${formatWeightOz(totalWeightOz)}`;
}

export function calculateGangSheetCustomerSectionSummary(
  units: GangSheetSectionSummaryUnitInput[],
  pricing: GangSheetSectionPricingConfig = DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG,
): GangSheetCustomerSectionSummary {
  let smallTierQuantity = 0;
  let largeTierQuantity = 0;

  for (const unit of units) {
    if (isLargeTier(unit.printWidthInches, unit.printHeightInches, pricing.sizeCutoffInches)) {
      largeTierQuantity += 1;
    } else {
      smallTierQuantity += 1;
    }
  }

  const totalQuantity = smallTierQuantity + largeTierQuantity;
  const totalPriceUsd =
    smallTierQuantity * pricing.smallTierPriceUsd + largeTierQuantity * pricing.largeTierPriceUsd;
  const totalWeightOz =
    smallTierQuantity * pricing.smallTierWeightOz + largeTierQuantity * pricing.largeTierWeightOz;
  const priceLine = buildGangSheetPriceLine(smallTierQuantity, largeTierQuantity, pricing);
  const weightLine = buildGangSheetWeightLine(smallTierQuantity, largeTierQuantity, pricing);

  return {
    smallTierQuantity,
    largeTierQuantity,
    totalQuantity,
    totalPriceUsd,
    totalWeightOz,
    priceLine,
    weightLine,
    combinedLine: `${priceLine} | ${weightLine}`,
  };
}

export function resolveGangSheetPriceTierForInches(
  printWidthInches: number,
  printHeightInches: number,
  sizeCutoffInches: number = DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG.sizeCutoffInches,
): "small" | "large" {
  return isLargeTier(printWidthInches, printHeightInches, sizeCutoffInches) ? "large" : "small";
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
    if (!image) {
      continue;
    }
    units.push({
      printWidthInches: image.printWidthInches,
      printHeightInches: image.printHeightInches,
    });
  }

  return calculateGangSheetCustomerSectionSummary(units, pricing);
}
