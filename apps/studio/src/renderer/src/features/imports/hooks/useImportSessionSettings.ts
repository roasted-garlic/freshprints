import { useCallback, useState } from "react";

import type {
  ImportArtworkBackgroundMode,
  ImportHalftoneMode,
} from "@fresh-prints/shared/types/design/artworkBackgroundSource.types";
import type { SmartProfileDimensionLists } from "@fresh-prints/shared/types/catalog/smartProfile.types";

import {
  formatImportSessionSettingsSummary,
  IMPORT_SESSION_DEFAULT_SETTINGS,
  type ImportSessionSettings,
} from "../constants/importSessionSettings";

/**
 * Page-visit-scoped import settings for Single + Batch.
 * Lives on ImportsPage — resets to defaults when leaving the page (unmount).
 */
export function useImportSessionSettings() {
  const [settings, setSettings] = useState<ImportSessionSettings>(IMPORT_SESSION_DEFAULT_SETTINGS);

  const setHalftoneMode = useCallback((halftoneMode: ImportHalftoneMode) => {
    setSettings((current) => ({ ...current, halftoneMode }));
  }, []);

  const setBackgroundMode = useCallback((backgroundMode: ImportArtworkBackgroundMode) => {
    setSettings((current) => ({ ...current, backgroundMode }));
  }, []);

  const setSmartProfilePresets = useCallback((smartProfilePresets?: Partial<SmartProfileDimensionLists>) => {
    setSettings((current) => ({ ...current, smartProfilePresets }));
  }, []);

  /** Clear transient Smart Profile presets so they never leak into the next import session. */
  const clearSmartProfilePresets = useCallback(() => {
    setSettings((current) => {
      if (!current.smartProfilePresets) {
        return current;
      }
      return { ...current, smartProfilePresets: undefined };
    });
  }, []);

  return {
    ...settings,
    setHalftoneMode,
    setBackgroundMode,
    setSmartProfilePresets,
    clearSmartProfilePresets,
    summaryText: formatImportSessionSettingsSummary(settings),
  };
}
