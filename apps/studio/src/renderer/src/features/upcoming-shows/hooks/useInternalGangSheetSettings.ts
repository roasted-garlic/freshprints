import { useCallback, useEffect, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import {
  internalGangSheetSettingsService,
  type InternalGangSheetSettings,
} from "../services/internalGangSheetSettingsService";
import type { GangSheetLayoutAndPricingSettingsInput } from "../services/gangSheetSettingsFields";

interface InternalGangSheetSettingsState {
  settings: InternalGangSheetSettings;
  error: string | null;
  isLoading: boolean;
}

const initialState: InternalGangSheetSettingsState = {
  settings: {},
  error: null,
  isLoading: true,
};

export function useInternalGangSheetSettings() {
  const { user } = useAuth();
  const [state, setState] = useState<InternalGangSheetSettingsState>(initialState);

  const loadSettings = useCallback(async () => {
    setState((currentState) => ({ ...currentState, error: null, isLoading: true }));

    try {
      const settings = await internalGangSheetSettingsService.getSettings();
      setState({ settings, error: null, isLoading: false });
    } catch (error) {
      setState({
        settings: {},
        error: error instanceof Error ? error.message : "Unable to load Internal Gang Sheet settings.",
        isLoading: false,
      });
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const updateSettings = useCallback(
    async (input: GangSheetLayoutAndPricingSettingsInput) => {
      if (!user) {
        throw new Error("You must be signed in to update Internal Gang Sheet settings.");
      }

      const settings = await internalGangSheetSettingsService.updateSettings(user, input);
      setState((currentState) => ({ ...currentState, settings }));
      return settings;
    },
    [user],
  );

  return {
    ...state,
    updateSettings,
  };
};
