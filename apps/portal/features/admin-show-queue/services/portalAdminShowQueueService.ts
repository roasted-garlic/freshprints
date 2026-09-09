import type {
  GetPortalAdminUpcomingShowQueueDashboardRequest,
  PortalAdminUpcomingShowQueueDashboardResponse,
} from '@fresh-prints/shared/types/portal/getPortalAdminUpcomingShowQueueDashboard.types';
import type {
  GetPortalAdminShowQueueRequestDesignsRequest,
  PortalAdminShowQueueRequestDesignsResponse,
} from '@fresh-prints/shared/types/portal/getPortalAdminShowQueueRequestDesigns.types';

import { callTracedFunction } from '../../../lib/firebase/tracedCallable';

export const portalAdminShowQueueService = {
  loadDashboard(
    request: GetPortalAdminUpcomingShowQueueDashboardRequest = {},
  ): Promise<PortalAdminUpcomingShowQueueDashboardResponse> {
    return callTracedFunction<
      GetPortalAdminUpcomingShowQueueDashboardRequest,
      PortalAdminUpcomingShowQueueDashboardResponse
    >('getPortalAdminUpcomingShowQueueDashboard', {
      source: 'portalAdminShowQueueService.loadDashboard',
    })(request);
  },

  loadRequestDesigns(
    request: GetPortalAdminShowQueueRequestDesignsRequest,
  ): Promise<PortalAdminShowQueueRequestDesignsResponse> {
    return callTracedFunction<
      GetPortalAdminShowQueueRequestDesignsRequest,
      PortalAdminShowQueueRequestDesignsResponse
    >('getPortalAdminShowQueueRequestDesigns', {
      source: 'portalAdminShowQueueService.loadRequestDesigns',
    })(request);
  },
};
