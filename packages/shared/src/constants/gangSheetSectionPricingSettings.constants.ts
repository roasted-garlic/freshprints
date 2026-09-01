import { MAX_STANDARD_PRINT_REQUEST_SIZE_INCHES } from "../utils/printRequestItemSizing";

export interface GangSheetSectionPricingConfig {
  sizeCutoffInches: number;
  smallTierPriceUsd: number;
  smallTierWeightOz: number;
  largeTierPriceUsd: number;
  largeTierWeightOz: number;
}

export interface GangSheetSectionPricingSettingsInput {
  gangSheetSectionPriceCutoffInches?: number;
  gangSheetSmallTierPriceUsd?: number;
  gangSheetSmallTierWeightOz?: number;
  gangSheetLargeTierPriceUsd?: number;
  gangSheetLargeTierWeightOz?: number;
}

export const DEFAULT_GANG_SHEET_SECTION_PRICE_CUTOFF_INCHES = 5;
export const DEFAULT_GANG_SHEET_SMALL_TIER_PRICE_USD = 1;
export const DEFAULT_GANG_SHEET_SMALL_TIER_WEIGHT_OZ = 0.4;
export const DEFAULT_GANG_SHEET_LARGE_TIER_PRICE_USD = 2;
export const DEFAULT_GANG_SHEET_LARGE_TIER_WEIGHT_OZ = 0.75;

export const MIN_GANG_SHEET_SECTION_PRICE_CUTOFF_INCHES = 0.01;
export const MAX_GANG_SHEET_SECTION_PRICE_CUTOFF_INCHES = MAX_STANDARD_PRINT_REQUEST_SIZE_INCHES;

export const MIN_GANG_SHEET_TIER_PRICE_USD = 0;
export const MAX_GANG_SHEET_TIER_PRICE_USD = 999.99;

export const MIN_GANG_SHEET_TIER_WEIGHT_OZ = 0.01;
export const MAX_GANG_SHEET_TIER_WEIGHT_OZ = 99.99;

export const DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG: GangSheetSectionPricingConfig = {
  sizeCutoffInches: DEFAULT_GANG_SHEET_SECTION_PRICE_CUTOFF_INCHES,
  smallTierPriceUsd: DEFAULT_GANG_SHEET_SMALL_TIER_PRICE_USD,
  smallTierWeightOz: DEFAULT_GANG_SHEET_SMALL_TIER_WEIGHT_OZ,
  largeTierPriceUsd: DEFAULT_GANG_SHEET_LARGE_TIER_PRICE_USD,
  largeTierWeightOz: DEFAULT_GANG_SHEET_LARGE_TIER_WEIGHT_OZ,
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function resolvePositiveNumber(value: unknown, fallback: number): number {
  return isFiniteNumber(value) && value > 0 ? value : fallback;
}

function resolveNonNegativeNumber(value: unknown, fallback: number): number {
  return isFiniteNumber(value) && value >= 0 ? value : fallback;
}

export function resolveGangSheetSectionPricingFromShowQueueSettings(
  input: GangSheetSectionPricingSettingsInput = {},
): GangSheetSectionPricingConfig {
  return {
    sizeCutoffInches: resolvePositiveNumber(
      input.gangSheetSectionPriceCutoffInches,
      DEFAULT_GANG_SHEET_SECTION_PRICE_CUTOFF_INCHES,
    ),
    smallTierPriceUsd: resolveNonNegativeNumber(
      input.gangSheetSmallTierPriceUsd,
      DEFAULT_GANG_SHEET_SMALL_TIER_PRICE_USD,
    ),
    smallTierWeightOz: resolvePositiveNumber(
      input.gangSheetSmallTierWeightOz,
      DEFAULT_GANG_SHEET_SMALL_TIER_WEIGHT_OZ,
    ),
    largeTierPriceUsd: resolveNonNegativeNumber(
      input.gangSheetLargeTierPriceUsd,
      DEFAULT_GANG_SHEET_LARGE_TIER_PRICE_USD,
    ),
    largeTierWeightOz: resolvePositiveNumber(
      input.gangSheetLargeTierWeightOz,
      DEFAULT_GANG_SHEET_LARGE_TIER_WEIGHT_OZ,
    ),
  };
}

export function isValidGangSheetSectionPriceCutoffInches(value: number): boolean {
  return (
    Number.isFinite(value) &&
    value > MIN_GANG_SHEET_SECTION_PRICE_CUTOFF_INCHES &&
    value <= MAX_GANG_SHEET_SECTION_PRICE_CUTOFF_INCHES
  );
}

export function isValidGangSheetTierPriceUsd(value: number): boolean {
  return (
    Number.isFinite(value) &&
    value >= MIN_GANG_SHEET_TIER_PRICE_USD &&
    value <= MAX_GANG_SHEET_TIER_PRICE_USD
  );
}

export function isValidGangSheetTierWeightOz(value: number): boolean {
  return (
    Number.isFinite(value) &&
    value >= MIN_GANG_SHEET_TIER_WEIGHT_OZ &&
    value <= MAX_GANG_SHEET_TIER_WEIGHT_OZ
  );
}

export function formatGangSheetSectionCutoffLabel(cutoffInches: number): string {
  const formatted =
    Number.isInteger(cutoffInches) ? `${cutoffInches}` : cutoffInches.toFixed(2).replace(/\.?0+$/, "");
  return `${formatted}"`;
}
