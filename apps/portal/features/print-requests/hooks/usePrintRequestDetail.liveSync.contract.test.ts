import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const here = dirname(fileURLToPath(import.meta.url));
const serviceSource = readFileSync(join(here, '../services/portalPrintRequestService.ts'), 'utf8');
const detailHookSource = readFileSync(join(here, 'usePrintRequestDetail.ts'), 'utf8');
const detailViewSource = readFileSync(
  join(here, '../../../app/(app)/requests/[id]/PrintRequestDetailView.tsx'),
  'utf8',
);

test('Portal service exposes request-scoped live request and allocation subscriptions', () => {
  assert.match(serviceSource, /subscribePrintRequest\(/);
  assert.match(serviceSource, /subscribeShowAllocationsForPrintRequest\(/);
  assert.match(serviceSource, /source: 'portalPrintRequestService.subscribePrintRequest'/);
  assert.match(
    serviceSource,
    /source: 'portalPrintRequestService.subscribeShowAllocationsForPrintRequest'/,
  );
});

test('Portal detail hook live-subscribes the open request and non-working items', () => {
  assert.match(detailHookSource, /subscribePrintRequest\(/);
  assert.match(detailHookSource, /subscribePrintRequestItems\(/);
  assert.match(detailHookSource, /isViewingWorkingRequest/);
});

test('Portal detail view live-subscribes allocations for the open request', () => {
  assert.match(detailViewSource, /subscribeShowAllocationsForPrintRequest\(/);
  assert.match(detailViewSource, /printRequestId/);
});
