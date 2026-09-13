import { useCallback, useEffect, useState } from "react";

import {
  DEFAULT_STANDARD_PRINT_SIZES_SETTINGS,
  type StandardPrintSizesSettings,
} from "@fresh-prints/shared/constants/printSize/standardPrintSizesSettings.constants";
import { standardPrintSizesSettingsService } from "../services/standardPrintSizesSettingsService";

export function useStandardPrintSizesSettings() {
  const [settings, setSettings] = useState<StandardPrintSizesSettings>(
    DEFAULT_STANDARD_PRINT_SIZES_SETTINGS,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(
    () =>
      standardPrintSizesSettingsService.subscribe(
        (next) => {
          setSettings(next);
          setError(null);
          setIsLoading(false);
        },
        (message) => {
          setError(message);
          setIsLoading(false);
        },
      ),
    [],
  );

  const save = useCallback(async (next: StandardPrintSizesSettings) => {
    setIsSaving(true);
    setError(null);
    setSaved(false);
    try {
      setSettings(await standardPrintSizesSettingsService.update(next));
      setSaved(true);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save standard print sizes.",
      );
    } finally {
      setIsSaving(false);
    }
  }, []);

  return { error, isLoading, isSaving, save, saved, settings, setSettings };
}
