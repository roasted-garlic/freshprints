import {
  isValidGangSheetSectionPriceCutoffInches,
  isValidGangSheetTierPriceUsd,
  isValidGangSheetTierWeightOz,
  MAX_GANG_SHEET_SECTION_PRICE_CUTOFF_INCHES,
} from "@fresh-prints/shared/constants/gangSheetSectionPricingSettings.constants";

const MIN_GANG_SHEET_WIDTH_INCHES = 10;
const MAX_GANG_SHEET_WIDTH_INCHES = 60;
const MIN_GANG_SHEET_SPACING_INCHES = 0;
const MAX_GANG_SHEET_SPACING_INCHES = 5;
const MIN_GANG_SHEET_MAX_LENGTH_INCHES = 10;
const MAX_GANG_SHEET_MAX_LENGTH_INCHES = 300;
const MIN_GANG_SHEET_LABEL_FONT_SIZE_PX = 20;
const MAX_GANG_SHEET_LABEL_FONT_SIZE_PX = 300;

export interface GangSheetLayoutAndPricingSettingsInput {
  gangSheetWidthInches?: number;
  gangSheetSideMarginInches?: number;
  gangSheetTopBottomMarginInches?: number;
  gangSheetGutterInches?: number;
  gangSheetMaxLengthInches?: number;
  gangSheetLabelFontSizePx?: number;
  gangSheetPocketPriceUsd?: number;
  gangSheetPocketWeightOz?: number;
  gangSheetStandardFullSizePriceUsd?: number;
  gangSheetStandardFullSizeWeightOz?: number;
  gangSheetStandardOversizedPriceUsd?: number;
  gangSheetStandardOversizedWeightOz?: number;
  gangSheetExtraOversizedPriceUsd?: number;
  gangSheetExtraOversizedWeightOz?: number;
  /** Legacy fields are read for fallback only and are no longer editable. */
  gangSheetSectionPriceCutoffInches?: number;
  gangSheetSmallTierPriceUsd?: number;
  gangSheetSmallTierWeightOz?: number;
  gangSheetLargeTierPriceUsd?: number;
  gangSheetLargeTierWeightOz?: number;
}

function isWithinRange(value: number | undefined, min: number, max: number): boolean {
  return value === undefined || (value >= min && value <= max);
}

/** Shared Studio validation for gang sheet layout + pricing/weight settings fields. */
export function assertGangSheetLayoutAndPricingSettingsInput(
  input: GangSheetLayoutAndPricingSettingsInput,
): void {
  if (!isWithinRange(input.gangSheetWidthInches, MIN_GANG_SHEET_WIDTH_INCHES, MAX_GANG_SHEET_WIDTH_INCHES)) {
    throw new Error(
      `Gang sheet width must be between ${MIN_GANG_SHEET_WIDTH_INCHES}" and ${MAX_GANG_SHEET_WIDTH_INCHES}".`,
    );
  }

  if (
    !isWithinRange(input.gangSheetSideMarginInches, MIN_GANG_SHEET_SPACING_INCHES, MAX_GANG_SHEET_SPACING_INCHES) ||
    !isWithinRange(
      input.gangSheetTopBottomMarginInches,
      MIN_GANG_SHEET_SPACING_INCHES,
      MAX_GANG_SHEET_SPACING_INCHES,
    ) ||
    !isWithinRange(input.gangSheetGutterInches, MIN_GANG_SHEET_SPACING_INCHES, MAX_GANG_SHEET_SPACING_INCHES)
  ) {
    throw new Error(
      `Gang sheet spacing values must be between ${MIN_GANG_SHEET_SPACING_INCHES}" and ${MAX_GANG_SHEET_SPACING_INCHES}".`,
    );
  }

  if (
    !isWithinRange(
      input.gangSheetMaxLengthInches,
      MIN_GANG_SHEET_MAX_LENGTH_INCHES,
      MAX_GANG_SHEET_MAX_LENGTH_INCHES,
    )
  ) {
    throw new Error(
      `Gang sheet max length must be between ${MIN_GANG_SHEET_MAX_LENGTH_INCHES}" and ${MAX_GANG_SHEET_MAX_LENGTH_INCHES}".`,
    );
  }

  if (
    !isWithinRange(
      input.gangSheetLabelFontSizePx,
      MIN_GANG_SHEET_LABEL_FONT_SIZE_PX,
      MAX_GANG_SHEET_LABEL_FONT_SIZE_PX,
    )
  ) {
    throw new Error(
      `Gang sheet label font size must be between ${MIN_GANG_SHEET_LABEL_FONT_SIZE_PX}px and ${MAX_GANG_SHEET_LABEL_FONT_SIZE_PX}px.`,
    );
  }

  if (
    input.gangSheetSectionPriceCutoffInches !== undefined &&
    !isValidGangSheetSectionPriceCutoffInches(input.gangSheetSectionPriceCutoffInches)
  ) {
    throw new Error(
      `Gang sheet pricing cutoff must be greater than 0" and at most ${MAX_GANG_SHEET_SECTION_PRICE_CUTOFF_INCHES}".`,
    );
  }

  if (input.gangSheetSmallTierPriceUsd !== undefined && !isValidGangSheetTierPriceUsd(input.gangSheetSmallTierPriceUsd)) {
    throw new Error("Small-tier price must be a finite number between $0 and $999.99.");
  }

  if (input.gangSheetLargeTierPriceUsd !== undefined && !isValidGangSheetTierPriceUsd(input.gangSheetLargeTierPriceUsd)) {
    throw new Error("Large-tier price must be a finite number between $0 and $999.99.");
  }

  if (
    input.gangSheetSmallTierWeightOz !== undefined &&
    !isValidGangSheetTierWeightOz(input.gangSheetSmallTierWeightOz)
  ) {
    throw new Error("Small-tier weight must be a finite number greater than 0 and at most 99.99 oz.");
  }

  if (
    input.gangSheetLargeTierWeightOz !== undefined &&
    !isValidGangSheetTierWeightOz(input.gangSheetLargeTierWeightOz)
  ) {
    throw new Error("Large-tier weight must be a finite number greater than 0 and at most 99.99 oz.");
  }

  const tierFields: Array<{ value: number | undefined; kind: "price" | "weight"; label: string }> = [
    { value: input.gangSheetPocketPriceUsd, kind: "price", label: "Pocket price" },
    { value: input.gangSheetStandardFullSizePriceUsd, kind: "price", label: "Standard Full Size price" },
    { value: input.gangSheetStandardOversizedPriceUsd, kind: "price", label: "Standard Oversized price" },
    { value: input.gangSheetExtraOversizedPriceUsd, kind: "price", label: "Extra Oversized price" },
    { value: input.gangSheetPocketWeightOz, kind: "weight", label: "Pocket weight" },
    { value: input.gangSheetStandardFullSizeWeightOz, kind: "weight", label: "Standard Full Size weight" },
    { value: input.gangSheetStandardOversizedWeightOz, kind: "weight", label: "Standard Oversized weight" },
    { value: input.gangSheetExtraOversizedWeightOz, kind: "weight", label: "Extra Oversized weight" },
  ];

  for (const field of tierFields) {
    if (field.value === undefined) {
      continue;
    }
    const valid = field.kind === "price"
      ? isValidGangSheetTierPriceUsd(field.value)
      : isValidGangSheetTierWeightOz(field.value);
    if (!valid) {
      throw new Error(
        field.kind === "price"
          ? `${field.label} must be a finite number between $0 and $999.99.`
          : `${field.label} must be a finite number greater than 0 and at most 99.99 oz.`,
      );
    }
  }
}
