import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PortalShowPrintProgress } from '@fresh-prints/shared/types/portal/getPortalShowPrintProgress.types';

import { buildPortalShowPrintProgressSignature } from './portalShowPrintProgressSignature';

describe('buildPortalShowPrintProgressSignature', () => {
  it('includes scheduledStartAt so schedule-only changes trigger polling refresh', () => {
    const base: PortalShowPrintProgress = {
      showId: 'show-1',
      productionStatus: 'open',
      accumulatedPrintMs: 0,
      activePrintStartedAtMs: null,
      printPausedAtMs: null,
      printFinishedAtMs: null,
      scheduledStartAt: '2026-08-01T01:00:00.000Z',
    };

    const before = buildPortalShowPrintProgressSignature([base]);
    const after = buildPortalShowPrintProgressSignature([
      { ...base, scheduledStartAt: '2026-08-02T01:00:00.000Z' },
    ]);

    assert.notEqual(before, after);
  });
});
