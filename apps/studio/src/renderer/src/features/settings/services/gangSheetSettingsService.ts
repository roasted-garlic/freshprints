import {
  DEFAULT_GANG_SHEET_GUTTER_INCHES,
  DEFAULT_GANG_SHEET_LABEL_FONT_SIZE_PX,
  DEFAULT_GANG_SHEET_MAX_LENGTH_INCHES,
  DEFAULT_GANG_SHEET_SIDE_MARGIN_INCHES,
  DEFAULT_GANG_SHEET_TOP_BOTTOM_MARGIN_INCHES,
  DEFAULT_GANG_SHEET_WIDTH_INCHES,
  showQueueSettingsService,
} from "../../upcoming-shows/services/showQueueSettingsService";
import { internalGangSheetSettingsService } from "../../upcoming-shows/services/internalGangSheetSettingsService";
import type { InternalGangSheetSettings } from "../../upcoming-shows/services/internalGangSheetSettingsService";
import type { ShowQueueSettings } from "../../upcoming-shows/services/showQueueSettingsService";
import type { GangSheetLayoutAndPricingSettingsInput } from "../../upcoming-shows/services/gangSheetSettingsFields";
import { resolveGangSheetSectionPricingFromSettings } from "@fresh-prints/shared/constants/gangSheetSectionPricingSettings.constants";

export interface ResolvedGangSheetSettings {
  gangSheetWidthInches: number;
  gangSheetSideMarginInches: number;
  gangSheetTopBottomMarginInches: number;
  gangSheetGutterInches: number;
  gangSheetMaxLengthInches: number;
  gangSheetLabelFontSizePx: number;
  sectionPricing: ReturnType<typeof resolveGangSheetSectionPricingFromSettings>;
}

function mergeDefinedSettings(
  legacy: GangSheetLayoutAndPricingSettingsInput,
  canonical: GangSheetLayoutAndPricingSettingsInput,
): GangSheetLayoutAndPricingSettingsInput {
  const merged: GangSheetLayoutAndPricingSettingsInput = { ...legacy };
  for (const [key, value] of Object.entries(canonical)) {
    if (value !== undefined) {
      (merged as Record<string, unknown>)[key] = value;
    }
  }
  return merged;
}

export function resolveEffectiveGangSheetSettings(
  canonical: GangSheetLayoutAndPricingSettingsInput = {},
  legacy: GangSheetLayoutAndPricingSettingsInput = {},
): ResolvedGangSheetSettings {
  const effective = mergeDefinedSettings(legacy, canonical);
  return {
    gangSheetWidthInches: effective.gangSheetWidthInches ?? DEFAULT_GANG_SHEET_WIDTH_INCHES,
    gangSheetSideMarginInches: effective.gangSheetSideMarginInches ?? DEFAULT_GANG_SHEET_SIDE_MARGIN_INCHES,
    gangSheetTopBottomMarginInches:
      effective.gangSheetTopBottomMarginInches ?? DEFAULT_GANG_SHEET_TOP_BOTTOM_MARGIN_INCHES,
    gangSheetGutterInches: effective.gangSheetGutterInches ?? DEFAULT_GANG_SHEET_GUTTER_INCHES,
    gangSheetMaxLengthInches: effective.gangSheetMaxLengthInches ?? DEFAULT_GANG_SHEET_MAX_LENGTH_INCHES,
    gangSheetLabelFontSizePx: effective.gangSheetLabelFontSizePx ?? DEFAULT_GANG_SHEET_LABEL_FONT_SIZE_PX,
    sectionPricing: resolveGangSheetSectionPricingFromSettings(effective),
  };
}

export async function loadEffectiveGangSheetSettings(): Promise<ResolvedGangSheetSettings> {
  const [canonical, legacy] = await Promise.all([
    showQueueSettingsService.getSettings(),
    internalGangSheetSettingsService.getSettings(),
  ]);
  return resolveEffectiveGangSheetSettings(canonical, legacy);
}

export const gangSheetSettingsService = {
  getSettings: loadEffectiveGangSheetSettings,
  async saveSettings(
    caller: Parameters<typeof showQueueSettingsService.updateSettings>[0],
    input: GangSheetLayoutAndPricingSettingsInput,
  ): Promise<ResolvedGangSheetSettings> {
    await showQueueSettingsService.updateSettings(caller, input);
    return loadEffectiveGangSheetSettings();
  },
};

export type { InternalGangSheetSettings, ShowQueueSettings };
