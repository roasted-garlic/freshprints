import { useCallback, useEffect, useRef, useState } from "react";

import {
  PORTAL_MAINTENANCE_DEFAULT_HEADING,
  PORTAL_MAINTENANCE_DEFAULT_MESSAGE,
  type PortalMaintenanceSettings,
  type PortalMaintenanceSettingsInput,
} from "@fresh-prints/shared/constants/portal/portalMaintenance.constants";
import { portalMaintenanceSettingsService } from "../services/portalMaintenanceSettingsService";

export function usePortalMaintenanceSettings() {
  const [settings, setSettings] = useState<PortalMaintenanceSettings>({
    enabled: false,
    heading: PORTAL_MAINTENANCE_DEFAULT_HEADING,
    message: PORTAL_MAINTENANCE_DEFAULT_MESSAGE,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const savedTimeoutRef = useRef<number | null>(null);

  const clearSavedSoon = useCallback(() => {
    if (savedTimeoutRef.current !== null) {
      window.clearTimeout(savedTimeoutRef.current);
    }
    savedTimeoutRef.current = window.setTimeout(() => {
      setSaved(false);
      savedTimeoutRef.current = null;
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current !== null) {
        window.clearTimeout(savedTimeoutRef.current);
      }
    };
  }, []);

  useEffect(
    () =>
      portalMaintenanceSettingsService.subscribe(
        (next) => {
          setSettings({
            enabled: next.enabled,
            heading: next.heading ?? PORTAL_MAINTENANCE_DEFAULT_HEADING,
            message: next.message ?? PORTAL_MAINTENANCE_DEFAULT_MESSAGE,
            maintenanceTestCustomerUid: next.maintenanceTestCustomerUid,
            updatedAt: next.updatedAt,
            updatedBy: next.updatedBy,
          });
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

  const save = useCallback(async (next: PortalMaintenanceSettingsInput): Promise<boolean> => {
    setIsSaving(true);
    setError(null);
    if (savedTimeoutRef.current !== null) {
      window.clearTimeout(savedTimeoutRef.current);
      savedTimeoutRef.current = null;
    }
    setSaved(false);
    try {
      setSettings(await portalMaintenanceSettingsService.update(next));
      setSaved(true);
      clearSavedSoon();
      return true;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save maintenance mode.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [clearSavedSoon]);

  return { error, isLoading, isSaving, save, saved, settings };
}
