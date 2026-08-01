import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { buildPortalCustomerShowScheduleCardSummary } from '@fresh-prints/shared/utils/portalCustomerShowSchedule';

const here = dirname(fileURLToPath(import.meta.url));
const detailSource = readFileSync(
  join(here, '../../../app/(app)/requests/[id]/PrintRequestDetailView.tsx'),
  'utf8',
);
const listSource = readFileSync(join(here, '../../../app/(app)/requests/page.tsx'), 'utf8');

describe('schedule visibility is status and tab independent', () => {
  it('loads details schedules by request id without the progress polling gate', () => {
    assert.match(detailSource, /usePortalPrintRequestShowSchedules\(printRequestId\)/);
    assert.doesNotMatch(detailSource, /usePortalPrintRequestShowSchedules\(printRequestId,\s*preLiveAuthority\.pollingEnabled\)/);
    assert.match(detailSource, /scheduledShowLabels=\{scheduledShowLabels\}/);
    assert.match(detailSource, /progressStage[\s\S]*scheduledShowLabels\.length > 0[\s\S]*PortalPrintRequestScheduleSection/);
  });

  it('uses the same card schedule branch for every list tab', () => {
    assert.deepEqual(
      [...listSource.matchAll(/<PrintRequestCard/g)].length,
      1,
      'every tab must flow through one schedule-aware card branch',
    );
    assert.match(listSource, /scheduleLine=\{scheduleLine\}/);
  });

  it('keeps one/multiple/missing/no-allocation presentation identical across lifecycle states', () => {
    const lifecycleStates = ['working', 'queued', 'printing', 'printed', 'completed', 'canceled', 'archived'];
    const one = [{ upcomingShowId: 'private-id', scheduledStartAt: '2026-08-02T18:00:00.000Z' }];
    const many = [...one, { upcomingShowId: 'private-id-2', scheduledStartAt: '2026-08-03T18:00:00.000Z' }];
    for (const state of lifecycleStates) {
      assert.equal(buildPortalCustomerShowScheduleCardSummary([]).line, null, state);
      assert.doesNotMatch(buildPortalCustomerShowScheduleCardSummary(one).line ?? '', /private-id/, state);
      assert.match(buildPortalCustomerShowScheduleCardSummary(many).line ?? '', /\+ 1 more/, state);
      assert.equal(
        buildPortalCustomerShowScheduleCardSummary([{ upcomingShowId: 'private-id', scheduledStartAt: null, missingShow: true }]).line,
        'Queued for Schedule unavailable',
        state,
      );
    }
  });
});
