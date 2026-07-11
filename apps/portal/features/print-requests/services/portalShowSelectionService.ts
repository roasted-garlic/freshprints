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

import { getPortalFunctions } from '../../../lib/firebase/client';
import { portalAuthService } from '../../auth/services/authService';

function mapCallableError(error: unknown): Error {
  return new Error(portalAuthService.getCallableErrorMessage(error));
}

export const portalShowSelectionService = {
  async listAllocatableShows(): Promise<PortalAllocatableShow[]> {
    try {
      const listCallable = httpsCallable<Record<string, never>, ListPortalAllocatableShowsResponse>(
        getPortalFunctions(),
        'listPortalAllocatableShows',
      );
      const result = await listCallable({});
      return result.data.shows;
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
