import { httpsCallable } from 'firebase/functions';

import type { ListPortalAllocatableShowsResponse } from '@fresh-prints/shared/types/portal/listPortalAllocatableShows.types';
import type { PortalAllocatableShow } from '@fresh-prints/shared/types/portal/listPortalAllocatableShows.types';
import type {
  GetPortalShowPrintProgressRequest,
  GetPortalShowPrintProgressResponse,
  PortalShowPrintProgress,
} from '@fresh-prints/shared/types/portal/getPortalShowPrintProgress.types';
import type {
  QueuePortalPrintRequestToShowRequest,
  QueuePortalPrintRequestToShowResponse,
} from '@fresh-prints/shared/types/portal/queuePortalPrintRequestToShow.types';
import { DEFAULT_PORTAL_QUEUE_CUTOFF_HOURS_BEFORE_START } from '@fresh-prints/shared/utils/showQueueCutoff';

import { getPortalFunctions } from '../../../lib/firebase/client';
import { mapPortalPrintRequestCallableError } from '../utils/mapPortalPrintRequestCallableError';

function mapCallableError(error: unknown): Error {
  return mapPortalPrintRequestCallableError(error);
}

export const portalShowSelectionService = {
  async listAllocatableShows(): Promise<{
    shows: PortalAllocatableShow[];
    portalQueueCutoffHoursBeforeStart: number;
  }> {
    try {
      const listCallable = httpsCallable<Record<string, never>, ListPortalAllocatableShowsResponse>(
        getPortalFunctions(),
        'listPortalAllocatableShows',
      );
      const result = await listCallable({});
      return {
        shows: result.data.shows,
        portalQueueCutoffHoursBeforeStart:
          typeof result.data.portalQueueCutoffHoursBeforeStart === 'number'
            ? result.data.portalQueueCutoffHoursBeforeStart
            : DEFAULT_PORTAL_QUEUE_CUTOFF_HOURS_BEFORE_START,
      };
    } catch (error) {
      throw mapCallableError(error);
    }
  },

  async getShowPrintProgress(printRequestId: string): Promise<PortalShowPrintProgress[]> {
    try {
      const progressCallable = httpsCallable<
        GetPortalShowPrintProgressRequest,
        GetPortalShowPrintProgressResponse
      >(getPortalFunctions(), 'getPortalShowPrintProgress');
      const result = await progressCallable({ printRequestId });
      return result.data.shows;
    } catch (error) {
      throw mapCallableError(error);
    }
  },

  async queuePrintRequestToShow(
    input: QueuePortalPrintRequestToShowRequest,
  ): Promise<QueuePortalPrintRequestToShowResponse> {
    try {
      const queueCallable = httpsCallable<
        QueuePortalPrintRequestToShowRequest,
        QueuePortalPrintRequestToShowResponse
      >(getPortalFunctions(), 'queuePortalPrintRequestToShow');
      const result = await queueCallable(input);
      return result.data;
    } catch (error) {
      throw mapCallableError(error);
    }
  },
};
