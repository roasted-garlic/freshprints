'use client';

import { useEffect, useState } from 'react';

import {
  DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS,
  portalInteractiveUpscaleUiEnabled,
} from '@fresh-prints/shared/constants/printRequest/printRequestLimitSettings.constants';
import { portalPrintRequestLimitService } from '../services/portalPrintRequestLimitService';

export function usePortalInteractiveUpscaleEnabled(): boolean {
  const [enabled, setEnabled] = useState(
    portalInteractiveUpscaleUiEnabled(DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS),
  );

  useEffect(
    () =>
      portalPrintRequestLimitService.subscribeSettings((settings) => {
        setEnabled(portalInteractiveUpscaleUiEnabled(settings));
      }),
    [],
  );

  return enabled;
}
