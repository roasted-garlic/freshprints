import { useEffect, useState } from 'react';

import {
  DEFAULT_STANDARD_PRINT_SIZES_SETTINGS,
  type StandardPrintSizesSettings,
} from '@fresh-prints/shared/constants/printSize/standardPrintSizesSettings.constants';

import { portalStandardPrintSizesService } from '../services/portalStandardPrintSizesService';

export function usePortalStandardPrintSizes() {
  const [settings, setSettings] = useState<StandardPrintSizesSettings>(
    DEFAULT_STANDARD_PRINT_SIZES_SETTINGS,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = portalStandardPrintSizesService.subscribe((next) => {
      setSettings(next);
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  return { isLoading, settings };
}
