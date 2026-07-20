import { useCallback, useEffect, useState } from "react";

import {
  DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS,
  type PrintRequestLimitSettings,
} from "@fresh-prints/shared/constants/printRequest/printRequestLimitSettings.constants";
import { printRequestLimitSettingsService } from "../services/printRequestLimitSettingsService";

export function usePrintRequestLimitSettings() {
  const [settings, setSettings] = useState<PrintRequestLimitSettings>(
    DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(
    () =>
      printRequestLimitSettingsService.subscribe(
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

  const save = useCallback(async (next: PrintRequestLimitSettings) => {
    setIsSaving(true);
    setError(null);
    setSaved(false);
    try {
      setSettings(await printRequestLimitSettingsService.update(next));
      setSaved(true);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save print request limits.",
      );
    } finally {
      setIsSaving(false);
    }
  }, []);

  return { error, isLoading, isSaving, save, saved, settings };
}
