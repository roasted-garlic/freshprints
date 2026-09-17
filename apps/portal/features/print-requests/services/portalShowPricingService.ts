import type { GetPortalShowPricingResponse } from '@fresh-prints/shared/types/portal/getPortalShowPricing.types';

import { callTracedFunction } from '../../../lib/firebase/tracedCallable';

export const portalShowPricingService = {
  async getPricing(): Promise<GetPortalShowPricingResponse> {
    return callTracedFunction<Record<string, never>, GetPortalShowPricingResponse>(
      'getPortalShowPricing',
      { source: 'portalShowPricingService.getPricing' },
    )({});
  },
};
