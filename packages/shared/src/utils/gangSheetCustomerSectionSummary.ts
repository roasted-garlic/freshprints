const GANG_SHEET_PRICE_TIER_THRESHOLD_INCHES = 6;
const GANG_SHEET_UNIT_WEIGHT_OZ = 0.75;

export interface GangSheetSectionSummaryUnitInput {
  printWidthInches: number;
  printHeightInches: number;
}

export interface GangSheetCustomerSectionSummary {
  oneDollarQuantity: number;
  twoDollarQuantity: number;
  totalQuantity: number;
  totalPriceUsd: number;
  totalWeightOz: number;
  priceLine: string;
  weightLine: string;
  combinedLine: string;
}

function isTwoDollarTier(printWidthInches: number, printHeightInches: number): boolean {
  return (
    printWidthInches >= GANG_SHEET_PRICE_TIER_THRESHOLD_INCHES ||
    printHeightInches >= GANG_SHEET_PRICE_TIER_THRESHOLD_INCHES
  );
}

function formatUsd(amount: number): string {
  if (Number.isInteger(amount)) {
    return `$${amount}`;
  }
  return `$${amount.toFixed(2)}`;
}

function formatWeightOz(amount: number): string {
  if (Number.isInteger(amount)) {
    return `${amount} oz`;
  }
  const trimmed = amount.toFixed(2).replace(/\.?0+$/, "");
  return `${trimmed} oz`;
}

export function buildGangSheetPriceLine(oneDollarQuantity: number, twoDollarQuantity: number): string {
  const parts: string[] = [];

  if (twoDollarQuantity > 0) {
    parts.push(`$2 x ${twoDollarQuantity}`);
  }
  if (oneDollarQuantity > 0) {
    parts.push(`$1 x ${oneDollarQuantity}`);
  }

  if (parts.length === 0) {
    return "$0";
  }

  const total = oneDollarQuantity + twoDollarQuantity * 2;
  if (parts.length === 1) {
    return `${parts[0]} = ${formatUsd(total)}`;
  }

  return `${parts.join(" + ")} = ${formatUsd(total)}`;
}

export function buildGangSheetWeightLine(totalQuantity: number): string {
  const totalWeightOz = GANG_SHEET_UNIT_WEIGHT_OZ * totalQuantity;
  return `Weight: ${GANG_SHEET_UNIT_WEIGHT_OZ}oz x ${totalQuantity} = ${formatWeightOz(totalWeightOz)}`;
}

export function calculateGangSheetCustomerSectionSummary(
  units: GangSheetSectionSummaryUnitInput[],
): GangSheetCustomerSectionSummary {
  let oneDollarQuantity = 0;
  let twoDollarQuantity = 0;

  for (const unit of units) {
    if (isTwoDollarTier(unit.printWidthInches, unit.printHeightInches)) {
      twoDollarQuantity += 1;
    } else {
      oneDollarQuantity += 1;
    }
  }

  const totalQuantity = oneDollarQuantity + twoDollarQuantity;
  const totalPriceUsd = oneDollarQuantity + twoDollarQuantity * 2;
  const totalWeightOz = GANG_SHEET_UNIT_WEIGHT_OZ * totalQuantity;
  const priceLine = buildGangSheetPriceLine(oneDollarQuantity, twoDollarQuantity);
  const weightLine = buildGangSheetWeightLine(totalQuantity);

  return {
    oneDollarQuantity,
    twoDollarQuantity,
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
): 1 | 2 {
  return isTwoDollarTier(printWidthInches, printHeightInches) ? 2 : 1;
}

export interface GangSheetSectionPlacementImageView {
  id: string;
  printWidthInches: number;
  printHeightInches: number;
}

export function calculateGangSheetSectionSummaryForPlacements(
  placements: Array<{ id: string }>,
  imagesById: Map<string, GangSheetSectionPlacementImageView>,
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

  return calculateGangSheetCustomerSectionSummary(units);
}
