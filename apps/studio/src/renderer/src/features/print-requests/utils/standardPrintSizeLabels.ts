import {
  findStandardPrintSizePresetContext,
  formatStandardPrintSizeSelectionLabel,
  type StandardPrintSizePresetKey,
  type StandardPrintSizesSettings,
} from "@fresh-prints/shared/constants/printSize/standardPrintSizesSettings.constants";

export function resolveStandardPrintSizeCardLabel(
  settings: StandardPrintSizesSettings,
  presetKey?: string | null,
): string {
  const compact = formatStandardPrintSizeSelectionLabel(settings, presetKey, { compact: true });
  return compact ? `Standard Sizes · ${compact}` : "Standard Sizes";
}

export function resolveStandardPrintSizeModalSelectionLabel(
  settings: StandardPrintSizesSettings,
  presetKey: StandardPrintSizePresetKey,
): string | null {
  const context = findStandardPrintSizePresetContext(settings, presetKey);
  if (!context) {
    return null;
  }
  return `${context.placement.label} · ${context.group.label} · ${context.preset.label}`;
}
