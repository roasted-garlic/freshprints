import { useEffect, useState } from "react";

import {
  resolveBrandLogoSettings,
  type BrandLogoDisplaySizesInput,
  type BrandLogoSettings,
} from "@fresh-prints/shared/constants/brand/brandLogoSettings.constants";
import { brandLogoSettingsService } from "../services/brandLogoSettingsService";

export function useBrandLogoSettings() {
  const [settings, setSettings] = useState<BrandLogoSettings>(() => resolveBrandLogoSettings(null));
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    return brandLogoSettingsService.subscribe(
      (next) => {
        setSettings(next);
        setError(null);
        setIsLoading(false);
      },
      (message) => {
        setError(message);
        setIsLoading(false);
      },
    );
  }, []);

  async function upload(
    app: Parameters<typeof brandLogoSettingsService.uploadAndFinalize>[0]["app"],
    slot: Parameters<typeof brandLogoSettingsService.uploadAndFinalize>[0]["slot"],
    file: File,
  ): Promise<void> {
    setIsSaving(true);
    setError(null);
    try {
      setSettings(await brandLogoSettingsService.uploadAndFinalize({ app, slot, file }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload brand logo.");
      throw err;
    } finally {
      setIsSaving(false);
    }
  }

  async function clear(
    app: Parameters<typeof brandLogoSettingsService.clearSlot>[0],
    slot: Parameters<typeof brandLogoSettingsService.clearSlot>[1],
  ): Promise<void> {
    setIsSaving(true);
    setError(null);
    try {
      setSettings(await brandLogoSettingsService.clearSlot(app, slot));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear brand logo.");
      throw err;
    } finally {
      setIsSaving(false);
    }
  }

  async function saveDisplaySizes(sizes: BrandLogoDisplaySizesInput): Promise<void> {
    setIsSaving(true);
    setError(null);
    try {
      setSettings(await brandLogoSettingsService.updateDisplaySizes(sizes));
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err && typeof (err as { code: unknown }).code === "string"
          ? (err as { code: string }).code
          : null;
      const message = err instanceof Error ? err.message : "Failed to save logo display sizes.";
      setError(code ? `${message} (${code})` : message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }

  return { clear, error, isLoading, isSaving, saveDisplaySizes, settings, upload };
}
