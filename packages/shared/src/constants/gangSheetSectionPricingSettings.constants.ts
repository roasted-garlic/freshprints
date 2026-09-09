import { MAX_STANDARD_PRINT_REQUEST_SIZE_INCHES } from "../utils/printRequestItemSizing";

export type GangSheetPricingTier =
  | "pocket"
  | "standard_full_size"
  | "standard_oversized"
  | "extra_oversized";

export const GANG_SHEET_PRICING_POLICY_VERSION = "width-four-tier-v1" as const;
export const GANG_SHEET_POCKET_MAX_WIDTH_INCHES = 4;
export const GANG_SHEET_STANDARD_FULL_SIZE_MAX_WIDTH_INCHES = 11;
export const GANG_SHEET_STANDARD_OVERSIZED_MAX_WIDTH_INCHES = 14;

export interface GangSheetTierPricing {
  priceUsd: number;
  weightOz: number;
}

export interface GangSheetSectionPricingConfig {
  policyVersion: typeof GANG_SHEET_PRICING_POLICY_VERSION;
  /** Fixed Pocket boundary retained as a read-only compatibility value for Studio count cards. */
  sizeCutoffInches: typeof GANG_SHEET_POCKET_MAX_WIDTH_INCHES;
  pocket: GangSheetTierPricing;
  standardFullSize: GangSheetTierPricing;
  standardOversized: GangSheetTierPricing;
  extraOversized: GangSheetTierPricing;
}

/** Canonical persisted four-tier fields. Breakpoints are product policy, not persisted. */
export interface GangSheetPricingSettingsInput {
  gangSheetPocketPriceUsd?: number;
  gangSheetPocketWeightOz?: number;
  gangSheetStandardFullSizePriceUsd?: number;
  gangSheetStandardFullSizeWeightOz?: number;
  gangSheetStandardOversizedPriceUsd?: number;
  gangSheetStandardOversizedWeightOz?: number;
  gangSheetExtraOversizedPriceUsd?: number;
  gangSheetExtraOversizedWeightOz?: number;
  /** Legacy fields retained only for backwards-compatible reads. */
  gangSheetSectionPriceCutoffInches?: number;
  gangSheetSmallTierPriceUsd?: number;
  gangSheetSmallTierWeightOz?: number;
  gangSheetLargeTierPriceUsd?: number;
  gangSheetLargeTierWeightOz?: number;
}

export const DEFAULT_GANG_SHEET_POCKET_PRICE_USD = 1;
export const DEFAULT_GANG_SHEET_POCKET_WEIGHT_OZ = 0.4;
export const DEFAULT_GANG_SHEET_STANDARD_FULL_SIZE_PRICE_USD = 2;
export const DEFAULT_GANG_SHEET_STANDARD_FULL_SIZE_WEIGHT_OZ = 0.75;
export const DEFAULT_GANG_SHEET_STANDARD_OVERSIZED_PRICE_USD = 3;
export const DEFAULT_GANG_SHEET_STANDARD_OVERSIZED_WEIGHT_OZ = 0.75;
export const DEFAULT_GANG_SHEET_EXTRA_OVERSIZED_PRICE_USD = 4;
export const DEFAULT_GANG_SHEET_EXTRA_OVERSIZED_WEIGHT_OZ = 0.75;

/** Legacy names remain exported for old call sites and historical settings readers. */
export const DEFAULT_GANG_SHEET_SECTION_PRICE_CUTOFF_INCHES = GANG_SHEET_POCKET_MAX_WIDTH_INCHES;
export const DEFAULT_GANG_SHEET_SMALL_TIER_PRICE_USD = DEFAULT_GANG_SHEET_POCKET_PRICE_USD;
export const DEFAULT_GANG_SHEET_SMALL_TIER_WEIGHT_OZ = DEFAULT_GANG_SHEET_POCKET_WEIGHT_OZ;
export const DEFAULT_GANG_SHEET_LARGE_TIER_PRICE_USD = DEFAULT_GANG_SHEET_STANDARD_FULL_SIZE_PRICE_USD;
export const DEFAULT_GANG_SHEET_LARGE_TIER_WEIGHT_OZ = DEFAULT_GANG_SHEET_STANDARD_FULL_SIZE_WEIGHT_OZ;

export const MIN_GANG_SHEET_SECTION_PRICE_CUTOFF_INCHES = 0.01;
export const MAX_GANG_SHEET_SECTION_PRICE_CUTOFF_INCHES = MAX_STANDARD_PRINT_REQUEST_SIZE_INCHES;
export const MIN_GANG_SHEET_TIER_PRICE_USD = 0;
export const MAX_GANG_SHEET_TIER_PRICE_USD = 999.99;
export const MIN_GANG_SHEET_TIER_WEIGHT_OZ = 0.01;
export const MAX_GANG_SHEET_TIER_WEIGHT_OZ = 99.99;

export const DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG: GangSheetSectionPricingConfig = {
  policyVersion: GANG_SHEET_PRICING_POLICY_VERSION,
  sizeCutoffInches: GANG_SHEET_POCKET_MAX_WIDTH_INCHES,
  pocket: {
    priceUsd: DEFAULT_GANG_SHEET_POCKET_PRICE_USD,
    weightOz: DEFAULT_GANG_SHEET_POCKET_WEIGHT_OZ,
  },
  standardFullSize: {
    priceUsd: DEFAULT_GANG_SHEET_STANDARD_FULL_SIZE_PRICE_USD,
    weightOz: DEFAULT_GANG_SHEET_STANDARD_FULL_SIZE_WEIGHT_OZ,
  },
  standardOversized: {
    priceUsd: DEFAULT_GANG_SHEET_STANDARD_OVERSIZED_PRICE_USD,
    weightOz: DEFAULT_GANG_SHEET_STANDARD_OVERSIZED_WEIGHT_OZ,
  },
  extraOversized: {
    priceUsd: DEFAULT_GANG_SHEET_EXTRA_OVERSIZED_PRICE_USD,
    weightOz: DEFAULT_GANG_SHEET_EXTRA_OVERSIZED_WEIGHT_OZ,
  },
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function resolvePrice(value: unknown, fallback: number): number {
  return isFiniteNumber(value) && value >= MIN_GANG_SHEET_TIER_PRICE_USD && value <= MAX_GANG_SHEET_TIER_PRICE_USD
    ? value
    : fallback;
}

function resolveWeight(value: unknown, fallback: number): number {
  return isFiniteNumber(value) && value >= MIN_GANG_SHEET_TIER_WEIGHT_OZ && value <= MAX_GANG_SHEET_TIER_WEIGHT_OZ
    ? value
    : fallback;
}

/**
 * Resolves one canonical four-tier configuration. Canonical fields win individually;
 * legacy small/large values are read only as safe compatibility fallbacks.
 */
export function resolveGangSheetSectionPricingFromSettings(
  input: GangSheetPricingSettingsInput = {},
): GangSheetSectionPricingConfig {
  const legacySmallPrice = resolvePrice(input.gangSheetSmallTierPriceUsd, DEFAULT_GANG_SHEET_POCKET_PRICE_USD);
  const legacySmallWeight = resolveWeight(input.gangSheetSmallTierWeightOz, DEFAULT_GANG_SHEET_POCKET_WEIGHT_OZ);
  const legacyLargePrice = resolvePrice(
    input.gangSheetLargeTierPriceUsd,
    DEFAULT_GANG_SHEET_STANDARD_FULL_SIZE_PRICE_USD,
  );
  const legacyLargeWeight = resolveWeight(
    input.gangSheetLargeTierWeightOz,
    DEFAULT_GANG_SHEET_STANDARD_FULL_SIZE_WEIGHT_OZ,
  );

  return {
    policyVersion: GANG_SHEET_PRICING_POLICY_VERSION,
    sizeCutoffInches: GANG_SHEET_POCKET_MAX_WIDTH_INCHES,
    pocket: {
      priceUsd: resolvePrice(input.gangSheetPocketPriceUsd, legacySmallPrice),
      weightOz: resolveWeight(input.gangSheetPocketWeightOz, legacySmallWeight),
    },
    standardFullSize: {
      priceUsd: resolvePrice(input.gangSheetStandardFullSizePriceUsd, legacyLargePrice),
      weightOz: resolveWeight(input.gangSheetStandardFullSizeWeightOz, legacyLargeWeight),
    },
    standardOversized: {
      priceUsd: resolvePrice(
        input.gangSheetStandardOversizedPriceUsd,
        DEFAULT_GANG_SHEET_STANDARD_OVERSIZED_PRICE_USD,
      ),
      weightOz: resolveWeight(
        input.gangSheetStandardOversizedWeightOz,
        legacyLargeWeight,
      ),
    },
    extraOversized: {
      priceUsd: resolvePrice(input.gangSheetExtraOversizedPriceUsd, DEFAULT_GANG_SHEET_EXTRA_OVERSIZED_PRICE_USD),
      weightOz: resolveWeight(input.gangSheetExtraOversizedWeightOz, legacyLargeWeight),
    },
  };
}

export const resolveGangSheetSectionPricingFromShowQueueSettings = resolveGangSheetSectionPricingFromSettings;

export function isValidGangSheetSectionPriceCutoffInches(value: number): boolean {
  return Number.isFinite(value) && value > MIN_GANG_SHEET_SECTION_PRICE_CUTOFF_INCHES && value <= MAX_GANG_SHEET_SECTION_PRICE_CUTOFF_INCHES;
}

export function isValidGangSheetTierPriceUsd(value: number): boolean {
  return Number.isFinite(value) && value >= MIN_GANG_SHEET_TIER_PRICE_USD && value <= MAX_GANG_SHEET_TIER_PRICE_USD;
}

export function isValidGangSheetTierWeightOz(value: number): boolean {
  return Number.isFinite(value) && value >= MIN_GANG_SHEET_TIER_WEIGHT_OZ && value <= MAX_GANG_SHEET_TIER_WEIGHT_OZ;
}

export function formatGangSheetSectionCutoffLabel(cutoffInches: number): string {
  const formatted = Number.isInteger(cutoffInches) ? `${cutoffInches}` : cutoffInches.toFixed(2).replace(/\.?0+$/, "");
  return `${formatted}"`;
}
