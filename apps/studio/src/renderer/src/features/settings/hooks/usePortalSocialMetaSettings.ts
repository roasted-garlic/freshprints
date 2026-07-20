import { useCallback, useEffect, useState } from "react";

import {
  DEFAULT_PORTAL_SOCIAL_META_SETTINGS,
  type PortalSocialMetaSettings,
} from "@fresh-prints/shared/constants/portal/portalSocialMetaSettings.constants";
import { portalSocialMetaSettingsService } from "../services/portalSocialMetaSettingsService";

export function usePortalSocialMetaSettings() {
  const [settings, setSettings] = useState<PortalSocialMetaSettings>(
    DEFAULT_PORTAL_SOCIAL_META_SETTINGS,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(
    () =>
      portalSocialMetaSettingsService.subscribe(
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

  const save = useCallback(
    async (next: Pick<PortalSocialMetaSettings, "ogTitle" | "ogDescription">) => {
      setIsSaving(true);
      setError(null);
      setSaved(false);
      try {
        setSettings(await portalSocialMetaSettingsService.update(next));
        setSaved(true);
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : "Unable to save Portal social sharing settings.",
        );
      } finally {
        setIsSaving(false);
      }
    },
    [],
  );

  return { error, isLoading, isSaving, save, saved, settings };
}
