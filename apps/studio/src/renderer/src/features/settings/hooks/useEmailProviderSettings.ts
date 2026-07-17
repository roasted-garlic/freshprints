import { useCallback, useEffect, useState } from "react";

import {
  DEFAULT_EMAIL_PROVIDER_SETTINGS,
  type EmailProviderSettings,
} from "@fresh-prints/shared/constants/emailProviders.constants";
import { emailProviderSettingsService } from "../services/emailProviderSettingsService";

export function useEmailProviderSettings() {
  const [settings, setSettings] = useState<EmailProviderSettings>(DEFAULT_EMAIL_PROVIDER_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(
    () =>
      emailProviderSettingsService.subscribe(
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

  const save = useCallback(async (next: EmailProviderSettings) => {
    setIsSaving(true);
    setError(null);
    setSaved(false);
    try {
      setSettings(await emailProviderSettingsService.update(next));
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save email providers.");
    } finally {
      setIsSaving(false);
    }
  }, []);

  return { error, isLoading, isSaving, save, saved, settings };
}
