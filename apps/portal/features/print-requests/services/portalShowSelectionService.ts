import type { ListPortalAllocatableShowsResponse } from '@fresh-prints/shared/types/portal/listPortalAllocatableShows.types';
import type { PortalAllocatableShow } from '@fresh-prints/shared/types/portal/listPortalAllocatableShows.types';
import type {
  GetPortalShowPrintProgressRequest,
  GetPortalShowPrintProgressResponse,
  PortalShowPrintProgress,
} from '@fresh-prints/shared/types/portal/getPortalShowPrintProgress.types';
import type {
  GetPortalPrintRequestShowSchedulesRequest,
  GetPortalPrintRequestShowSchedulesResponse,
} from '@fresh-prints/shared/types/portal/getPortalPrintRequestShowSchedules.types';
import type { PortalCustomerShowSchedule } from '@fresh-prints/shared/utils/portalCustomerShowSchedule';
import type {
  QueuePortalPrintRequestToShowRequest,
  QueuePortalPrintRequestToShowResponse,
} from '@fresh-prints/shared/types/portal/queuePortalPrintRequestToShow.types';
import { DEFAULT_PORTAL_QUEUE_CUTOFF_HOURS_BEFORE_START } from '@fresh-prints/shared/utils/showQueueCutoff';

import { callTracedFunction } from '../../../lib/firebase/tracedCallable';
import { getPortalAuth } from '../../../lib/firebase/client';
import { mapPortalPrintRequestCallableError } from '../utils/mapPortalPrintRequestCallableError';
import { sharePortalPrintRequestScheduleLoad } from './portalPrintRequestScheduleLoadOwner';
import { sharePortalShowQueueSubmission } from './portalShowQueueSubmissionOwner';

function mapCallableError(error: unknown): Error {
  return mapPortalPrintRequestCallableError(error);
}

export const portalShowSelectionService = {
  async listAllocatableShows(): Promise<{
    shows: PortalAllocatableShow[];
    portalQueueCutoffHoursBeforeStart: number;
  }> {
    try {
      const result = await callTracedFunction<Record<string, never>, ListPortalAllocatableShowsResponse>(
        'listPortalAllocatableShows',
        { source: 'portalShowSelectionService.listAllocatableShows' },
      )({});
      return {
        shows: result.shows,
        portalQueueCutoffHoursBeforeStart:
          typeof result.portalQueueCutoffHoursBeforeStart === 'number'
            ? result.portalQueueCutoffHoursBeforeStart
            : DEFAULT_PORTAL_QUEUE_CUTOFF_HOURS_BEFORE_START,
      };
    } catch (error) {
      throw mapCallableError(error);
    }
  },

  async getShowPrintProgress(printRequestId: string): Promise<PortalShowPrintProgress[]> {
    try {
      const result = await callTracedFunction<
        GetPortalShowPrintProgressRequest,
        GetPortalShowPrintProgressResponse
      >('getPortalShowPrintProgress', {
        source: 'portalShowSelectionService.getShowPrintProgress',
      })({ printRequestId });
      return result.shows;
    } catch (error) {
      throw mapCallableError(error);
    }
  },

  async getPrintRequestShowSchedules(
    printRequestIds: string[],
  ): Promise<Record<string, PortalCustomerShowSchedule[]>> {
    if (printRequestIds.length === 0) {
      return {};
    }

    try {
      const result = await sharePortalPrintRequestScheduleLoad(printRequestIds, () =>
        callTracedFunction<
          GetPortalPrintRequestShowSchedulesRequest,
          GetPortalPrintRequestShowSchedulesResponse
        >('getPortalPrintRequestShowSchedules', {
          source: 'portalShowSelectionService.getPrintRequestShowSchedules',
        })({ printRequestIds }),
      );

      const schedulesByRequestId: Record<string, PortalCustomerShowSchedule[]> = {};
      for (const entry of result.requests) {
        schedulesByRequestId[entry.printRequestId] = entry.shows.map((show) => ({
          upcomingShowId: show.upcomingShowId,
          scheduledStartAt: show.scheduledStartAt,
          ...(show.missingShow ? { missingShow: true } : {}),
        }));
      }
      return schedulesByRequestId;
    } catch (error) {
      throw mapCallableError(error);
    }
  },

  async queuePrintRequestToShow(
    input: QueuePortalPrintRequestToShowRequest,
  ): Promise<QueuePortalPrintRequestToShowResponse> {
    try {
      const key = [
        getPortalAuth().currentUser?.uid ?? 'signed-out',
        input.printRequestId,
        input.upcomingShowId,
      ].join(':');
      return await sharePortalShowQueueSubmission(key, () =>
        callTracedFunction<
          QueuePortalPrintRequestToShowRequest,
          QueuePortalPrintRequestToShowResponse
        >('queuePortalPrintRequestToShow', {
          source: 'portalShowSelectionService.queuePrintRequestToShow',
        })(input),
      );
    } catch (error) {
      throw mapCallableError(error);
    }
  },
};
