import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  portalPrintProgressPollDelay,
  shouldPollPortalPrintProgress,
} from './portalPrintProgressPolling';

describe('Portal print progress polling policy', () => {
  it('backs off boundedly when progress is unchanged', () => {
    assert.deepEqual(
      [0, 1, 2, 8].map(portalPrintProgressPollDelay),
      [5_000, 10_000, 10_000, 10_000],
    );
  });

  it('stops for hidden, disabled, missing, and terminal requests', () => {
    const base = { enabled: true, isDocumentVisible: true, printRequestId: 'request' };
    assert.equal(shouldPollPortalPrintProgress(base), true);
    assert.equal(shouldPollPortalPrintProgress({ ...base, isDocumentVisible: false }), false);
    assert.equal(shouldPollPortalPrintProgress({ ...base, productionStatus: 'completed' }), false);
    assert.equal(shouldPollPortalPrintProgress({ ...base, productionStatus: 'fully_printed' }), false);
  });
});
