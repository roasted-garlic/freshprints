import { useCallback, useState } from "react";

import type {
  ImportArtworkBackgroundMode,
  ImportHalftoneMode,
} from "@fresh-prints/shared/types/design/artworkBackgroundSource.types";

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

  return {
    ...settings,
    setHalftoneMode,
    setBackgroundMode,
    summaryText: formatImportSessionSettingsSummary(settings),
  };
}
