import { useCallback, useEffect, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import type { GangSheetLayoutAndPricingSettingsInput } from "../../upcoming-shows/services/gangSheetSettingsFields";
import {
  gangSheetSettingsService,
  type ResolvedGangSheetSettings,
} from "../services/gangSheetSettingsService";

const EMPTY_SETTINGS: ResolvedGangSheetSettings = {
  gangSheetWidthInches: 23,
  gangSheetSideMarginInches: 0.25,
  gangSheetTopBottomMarginInches: 0.5,
  gangSheetGutterInches: 0.5,
  gangSheetMaxLengthInches: 300,
  gangSheetLabelFontSizePx: 120,
  sectionPricing: {
    policyVersion: "width-four-tier-v1",
    sizeCutoffInches: 4,
    pocket: { priceUsd: 1, weightOz: 0.4 },
    standardFullSize: { priceUsd: 2, weightOz: 0.75 },
    standardOversized: { priceUsd: 3, weightOz: 0.75 },
    extraOversized: { priceUsd: 4, weightOz: 0.75 },
  },
};

export function useGangSheetSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<ResolvedGangSheetSettings>(EMPTY_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setSettings(await gangSheetSettingsService.getSettings());
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load Gang Sheet Settings.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(
    async (input: GangSheetLayoutAndPricingSettingsInput) => {
      if (!user) {
        setError("You must be signed in to update Gang Sheet Settings.");
        return;
      }
      setIsSaving(true);
      setSaved(false);
      setError(null);
      try {
        setSettings(await gangSheetSettingsService.saveSettings(user, input));
        setSaved(true);
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Unable to save Gang Sheet Settings.");
      } finally {
        setIsSaving(false);
      }
    },
    [user],
  );

  return { error, isLoading, isSaving, saved, settings, save };
}
