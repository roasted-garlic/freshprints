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
import {
  PORTAL_PRINT_REQUEST_SHOW_SCHEDULE_BATCH_MAX,
  type PortalCustomerShowSchedule,
} from '@fresh-prints/shared/utils/portalCustomerShowSchedule';
import type {
  QueuePortalPrintRequestToShowRequest,
  QueuePortalPrintRequestToShowResponse,
} from '@fresh-prints/shared/types/portal/queuePortalPrintRequestToShow.types';
import type {
  UnqueuePortalPrintRequestFromShowRequest,
  UnqueuePortalPrintRequestFromShowResponse,
} from '@fresh-prints/shared/types/portal/unqueuePortalPrintRequestFromShow.types';
import { DEFAULT_PORTAL_QUEUE_CUTOFF_HOURS_BEFORE_START } from '@fresh-prints/shared/utils/showQueueCutoff';

import { callTracedFunction } from '../../../lib/firebase/tracedCallable';
import { getPortalAuth } from '../../../lib/firebase/client';
import { mapPortalPrintRequestCallableError } from '../utils/mapPortalPrintRequestCallableError';
import { sharePortalPrintRequestScheduleLoad } from './portalPrintRequestScheduleLoadOwner';
import { sharePortalShowQueueSubmission } from './portalShowQueueSubmissionOwner';
import {
  readPortalAllocatableShowsCached,
} from './portalAllocatableShowsReadCache';

function mapCallableError(error: unknown): Error {
  return mapPortalPrintRequestCallableError(error);
}

async function loadAllocatableShowsFromCallable(): Promise<{
  shows: PortalAllocatableShow[];
  portalQueueCutoffHoursBeforeStart: number;
}> {
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
}

export async function prefetchPortalAllocatableShows(): Promise<void> {
  if (!getPortalAuth().currentUser) {
    return;
  }

  try {
    await readPortalAllocatableShowsCached(loadAllocatableShowsFromCallable);
  } catch {
    // Prefetch is best-effort; the modal surfaces errors on explicit open.
  }
}

type ScheduleBatchLoader = (
  printRequestIds: string[],
) => Promise<GetPortalPrintRequestShowSchedulesResponse>;

export async function loadPortalPrintRequestShowSchedulesInBatches(
  printRequestIds: readonly string[],
  loadBatch: ScheduleBatchLoader,
): Promise<Record<string, PortalCustomerShowSchedule[]>> {
  const uniqueIds = [...new Set(printRequestIds.map((id) => id.trim()).filter(Boolean))];
  const batches: string[][] = [];
  for (let index = 0; index < uniqueIds.length; index += PORTAL_PRINT_REQUEST_SHOW_SCHEDULE_BATCH_MAX) {
    batches.push(uniqueIds.slice(index, index + PORTAL_PRINT_REQUEST_SHOW_SCHEDULE_BATCH_MAX));
  }
  if (batches.length === 0) return {};

  const results = await Promise.allSettled(batches.map((batch) => loadBatch(batch)));
  const schedulesByRequestId: Record<string, PortalCustomerShowSchedule[]> = {};
  let successfulBatchCount = 0;
  let firstFailure: unknown;

  for (const result of results) {
    if (result.status === 'rejected') {
      firstFailure ??= result.reason;
      continue;
    }
    successfulBatchCount += 1;
    for (const entry of result.value.requests) {
      schedulesByRequestId[entry.printRequestId] = entry.shows.map((show) => ({
        upcomingShowId: show.upcomingShowId,
        scheduledStartAt: show.scheduledStartAt,
        ...(show.missingShow ? { missingShow: true } : {}),
      }));
    }
  }

  if (successfulBatchCount === 0 && firstFailure) throw firstFailure;
  return schedulesByRequestId;
}

export const portalShowSelectionService = {
  async listAllocatableShows(): Promise<{
    shows: PortalAllocatableShow[];
    portalQueueCutoffHoursBeforeStart: number;
  }> {
    try {
      return await readPortalAllocatableShowsCached(loadAllocatableShowsFromCallable);
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
      return await sharePortalPrintRequestScheduleLoad(printRequestIds, () =>
        loadPortalPrintRequestShowSchedulesInBatches(printRequestIds, (batchIds) =>
          callTracedFunction<
          GetPortalPrintRequestShowSchedulesRequest,
          GetPortalPrintRequestShowSchedulesResponse
          >('getPortalPrintRequestShowSchedules', {
            source: 'portalShowSelectionService.getPrintRequestShowSchedules',
          })({ printRequestIds: batchIds }),
        ),
      );
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

  async unqueuePrintRequestFromShow(
    input: UnqueuePortalPrintRequestFromShowRequest,
  ): Promise<UnqueuePortalPrintRequestFromShowResponse> {
    try {
      return await callTracedFunction<
        UnqueuePortalPrintRequestFromShowRequest,
        UnqueuePortalPrintRequestFromShowResponse
      >('unqueuePortalPrintRequestFromShow', {
        source: 'portalShowSelectionService.unqueuePrintRequestFromShow',
      })(input);
    } catch (error) {
      throw mapCallableError(error);
    }
  },
};
