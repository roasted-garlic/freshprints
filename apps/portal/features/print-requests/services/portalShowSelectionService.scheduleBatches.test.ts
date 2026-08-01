import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PORTAL_PRINT_REQUEST_SHOW_SCHEDULE_BATCH_MAX } from '@fresh-prints/shared/utils/portalCustomerShowSchedule';

import { loadPortalPrintRequestShowSchedulesInBatches } from './portalShowSelectionService';

describe('loadPortalPrintRequestShowSchedulesInBatches', () => {
  it('chunks histories above the callable cap and merges every status-independent request result', async () => {
    const ids = Array.from({ length: PORTAL_PRINT_REQUEST_SHOW_SCHEDULE_BATCH_MAX + 3 }, (_, index) => `request-${index}`);
    const batches: string[][] = [];
    const result = await loadPortalPrintRequestShowSchedulesInBatches(ids, async (batch) => {
      batches.push(batch);
      return { requests: batch.map((printRequestId) => ({ printRequestId, shows: [] })) };
    });
    assert.deepEqual(batches.map((batch) => batch.length), [50, 3]);
    assert.equal(Object.keys(result).length, ids.length);
  });

  it('preserves successful chunks when a later chunk fails', async () => {
    const ids = Array.from({ length: 51 }, (_, index) => `request-${index}`);
    const result = await loadPortalPrintRequestShowSchedulesInBatches(ids, async (batch) => {
      if (batch.includes('request-50')) throw new Error('later batch failed');
      return { requests: batch.map((printRequestId) => ({ printRequestId, shows: [] })) };
    });
    assert.equal(Object.keys(result).length, 50);
    assert.equal(result['request-50'], undefined);
  });

  it('rejects when every chunk fails', async () => {
    await assert.rejects(
      loadPortalPrintRequestShowSchedulesInBatches(['request-1'], async () => { throw new Error('failed'); }),
      /failed/,
    );
  });
});
