import { useCallback, useEffect, useState } from "react";

import {
  DEFAULT_PORTAL_HELP_SETTINGS,
  type PortalHelpSettings,
  type PortalHelpSettingsInput,
} from "@fresh-prints/shared/constants/portal/portalHelpSettings.constants";
import { portalHelpSettingsService } from "../services/portalHelpSettingsService";

export function usePortalHelpSettings() {
  const [settings, setSettings] = useState<PortalHelpSettings>({
    ...DEFAULT_PORTAL_HELP_SETTINGS,
  });
  const [docStatus, setDocStatus] = useState<"missing" | "loaded">("missing");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(
    () =>
      portalHelpSettingsService.subscribe(
        (load) => {
          setSettings(load.settings);
          setDocStatus(load.status);
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

  const save = useCallback(async (next: PortalHelpSettingsInput): Promise<boolean> => {
    setIsSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await portalHelpSettingsService.update(next);
      setSettings(updated);
      setDocStatus("loaded");
      setSaved(true);
      return true;
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save FAQ and How To settings.",
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  return { docStatus, error, isLoading, isSaving, save, saved, settings };
}
