import { useCallback, useEffect, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import {
  showQueueSettingsService,
  type ShowQueueSettings,
  type WhatnotAssistedImportSummary,
} from "../services/showQueueSettingsService";

interface ShowQueueSettingsState {
  settings: ShowQueueSettings;
  error: string | null;
  isLoading: boolean;
}

const initialState: ShowQueueSettingsState = {
  settings: {},
  error: null,
  isLoading: true,
};

export function useShowQueueSettings() {
  const { user } = useAuth();
  const [state, setState] = useState<ShowQueueSettingsState>(initialState);

  const loadSettings = useCallback(async () => {
    setState((currentState) => ({ ...currentState, error: null, isLoading: true }));

    try {
      const settings = await showQueueSettingsService.getSettings();
      setState({ settings, error: null, isLoading: false });
    } catch (error) {
      setState({
        settings: {},
        error: error instanceof Error ? error.message : "Unable to load Show Queue settings.",
        isLoading: false,
      });
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const updateSettings = useCallback(
    async (input: {
      defaultMaxTotalQuantity?: number;
      whatnotShowBaseUrl?: string;
      portalQueueCutoffHoursBeforeStart?: number;
      gangSheetWidthInches?: number;
      gangSheetSideMarginInches?: number;
      gangSheetTopBottomMarginInches?: number;
      gangSheetGutterInches?: number;
      gangSheetMaxLengthInches?: number;
      gangSheetLabelFontSizePx?: number;
    }) => {
      if (!user) {
        throw new Error("You must be signed in to update Show Queue settings.");
      }

      const settings = await showQueueSettingsService.updateSettings(user, input);
      setState((currentState) => ({ ...currentState, settings }));
      return settings;
    },
    [user],
  );

  const recordAssistedImportResult = useCallback(
    async (
      result:
        | { status: "succeeded"; summary: WhatnotAssistedImportSummary }
        | { status: "failed"; error: string },
    ) => {
      if (!user) {
        throw new Error("You must be signed in to record a Whatnot import result.");
      }

      const settings = await showQueueSettingsService.recordWhatnotAssistedImportResult(user, result);
      setState((currentState) => ({ ...currentState, settings }));
      return settings;
    },
    [user],
  );

  return {
    ...state,
    updateSettings,
    recordAssistedImportResult,
  };
}
