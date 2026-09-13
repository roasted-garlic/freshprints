import type {
  ImportArtworkBackgroundMode,
  ImportHalftoneMode,
} from "@fresh-prints/shared/types/design/artworkBackgroundSource.types";
import type { SmartProfileDimensionLists } from "@fresh-prints/shared/types/catalog/smartProfile.types";

export const IMPORT_SESSION_DEFAULT_HALFTONE_MODE: ImportHalftoneMode = "normal";
export const IMPORT_SESSION_DEFAULT_BACKGROUND_MODE: ImportArtworkBackgroundMode = "auto";

export interface ImportSessionSettings {
  halftoneMode: ImportHalftoneMode;
  backgroundMode: ImportArtworkBackgroundMode;
  /** Optional Smart Profile presets to apply to batch imports. Transient session state only. */
  smartProfilePresets?: Partial<SmartProfileDimensionLists>;
}

export const IMPORT_SESSION_DEFAULT_SETTINGS: ImportSessionSettings = {
  halftoneMode: IMPORT_SESSION_DEFAULT_HALFTONE_MODE,
  backgroundMode: IMPORT_SESSION_DEFAULT_BACKGROUND_MODE,
};

const HALFTONE_SUMMARY: Record<ImportHalftoneMode, string> = {
  normal: "Normal",
  all_halftones: "All halftones",
};

const BACKGROUND_SUMMARY: Record<ImportArtworkBackgroundMode, string> = {
  auto: "Auto",
  all_light: "All light",
  all_dark: "All dark",
};

/** Compact status line for the shell header (always visible on Imports). */
export function formatImportSessionSettingsSummary(settings: ImportSessionSettings): string {
  const parts = [
    `Halftone: ${HALFTONE_SUMMARY[settings.halftoneMode]}`,
    `Background: ${BACKGROUND_SUMMARY[settings.backgroundMode]}`,
  ];

  if (settings.smartProfilePresets) {
    const presetCount = Object.keys(settings.smartProfilePresets).length;
    if (presetCount > 0) {
      parts.push(`Smart Profile: ${presetCount} preset${presetCount === 1 ? "" : "s"}`);
    }
  }

  return parts.join(" · ");
}

export function halftoneModeLabel(mode: ImportHalftoneMode): string {
  return HALFTONE_SUMMARY[mode];
}

export function backgroundModeLabel(mode: ImportArtworkBackgroundMode): string {
  return BACKGROUND_SUMMARY[mode];
}
