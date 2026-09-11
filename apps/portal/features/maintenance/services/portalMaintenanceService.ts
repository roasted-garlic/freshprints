import type {
  PortalMaintenancePublicState,
} from '@fresh-prints/shared/constants/portal/portalMaintenance.constants';

import { callTracedFunction } from '../../../lib/firebase/tracedCallable';

export const portalMaintenanceService = {
  async loadState(): Promise<PortalMaintenancePublicState> {
    return callTracedFunction<Record<string, never>, PortalMaintenancePublicState>(
      'getPortalMaintenanceState',
      { source: 'portalMaintenanceService.loadState' },
    )({});
  },
};
