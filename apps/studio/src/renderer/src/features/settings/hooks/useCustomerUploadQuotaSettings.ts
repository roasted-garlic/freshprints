import { useCallback, useEffect, useState } from "react";

import {
  DEFAULT_CUSTOMER_UPLOAD_QUOTA_SETTINGS,
  type CustomerUploadQuotaSettings,
} from "@fresh-prints/shared/constants/customerUpload/customerUploadQuotaSettings.constants";
import { customerUploadQuotaSettingsService } from "../services/customerUploadQuotaSettingsService";

export function useCustomerUploadQuotaSettings() {
  const [settings, setSettings] = useState<CustomerUploadQuotaSettings>(
    DEFAULT_CUSTOMER_UPLOAD_QUOTA_SETTINGS,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(
    () =>
      customerUploadQuotaSettingsService.subscribe(
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

  const save = useCallback(async (next: CustomerUploadQuotaSettings) => {
    setIsSaving(true);
    setError(null);
    setSaved(false);
    try {
      setSettings(await customerUploadQuotaSettingsService.update(next));
      setSaved(true);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save upload quotas.",
      );
    } finally {
      setIsSaving(false);
    }
  }, []);

  return { error, isLoading, isSaving, save, saved, settings };
}
