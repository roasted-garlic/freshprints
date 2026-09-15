import { useCallback, useEffect, useRef, useState } from "react";

import type {
  PortalDevCustomerAccessSettings,
  PortalDevCustomerAccessSettingsInput,
} from "@fresh-prints/shared/constants/portal/portalDevCustomerAccess.constants";
import { portalDevCustomerAccessSettingsService } from "../services/portalDevCustomerAccessSettingsService";

export function usePortalDevCustomerAccessSettings() {
  const [settings, setSettings] = useState<PortalDevCustomerAccessSettings>({
    approvedEmails: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const savedTimeoutRef = useRef<number | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

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

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    void portalDevCustomerAccessSettingsService
      .get()
      .then((next) => {
        if (!cancelled) {
          setSettings({
            approvedEmails: next.approvedEmails,
            updatedAt: next.updatedAt,
            updatedBy: next.updatedBy,
          });
          setError(null);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load DEV customer access settings.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const save = useCallback(
    async (next: PortalDevCustomerAccessSettingsInput): Promise<boolean> => {
      setIsSaving(true);
      setError(null);
      if (savedTimeoutRef.current !== null) {
        window.clearTimeout(savedTimeoutRef.current);
        savedTimeoutRef.current = null;
      }
      setSaved(false);
      try {
        setSettings(await portalDevCustomerAccessSettingsService.update(next));
        setSaved(true);
        clearSavedSoon();
        return true;
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : "Unable to save DEV customer access settings.",
        );
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [clearSavedSoon],
  );

  const reload = useCallback(() => {
    setReloadToken((current) => current + 1);
  }, []);

  return { error, isLoading, isSaving, reload, save, saved, settings };
}
