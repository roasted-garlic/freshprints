'use client';

import { useEffect, useState } from 'react';

import { DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG } from '@fresh-prints/shared/constants/gangSheetSectionPricingSettings.constants';
import type { GangSheetSectionPricingConfig } from '@fresh-prints/shared/constants/gangSheetSectionPricingSettings.constants';

import { portalShowPricingService } from '../services/portalShowPricingService';

export function usePortalShowPricing() {
  const [pricing, setPricing] = useState<GangSheetSectionPricingConfig>(DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    void portalShowPricingService.getPricing()
      .then((response) => {
        if (mounted) setPricing(response.sectionPricing);
      })
      .catch(() => undefined)
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return { isLoading, pricing };
}
