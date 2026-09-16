import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, it } from 'node:test';

const here = resolve(import.meta.dirname);
const repoRoot = resolve(here, '../../../../..');

const listSource = readFileSync(
  join(repoRoot, 'apps/portal/app/(app)/requests/page.tsx'),
  'utf8',
);
const cardSource = readFileSync(
  join(repoRoot, 'apps/portal/features/print-requests/components/PrintRequestCard.tsx'),
  'utf8',
);
const detailSource = readFileSync(
  join(repoRoot, 'apps/portal/app/(app)/requests/[id]/PrintRequestDetailView.tsx'),
  'utf8',
);
const queueModalSource = readFileSync(
  join(repoRoot, 'apps/portal/features/print-requests/components/PortalQueueToShowModal.tsx'),
  'utf8',
);
const continuableModalSource = readFileSync(
  join(repoRoot, 'apps/portal/features/shared/components/PortalPickContinuableRequestModal.tsx'),
  'utf8',
);

describe('Portal Print Request count parity contracts', () => {
  it('passes the live item summary into the list card and renders its fields', () => {
    assert.match(listSource, /const summary = summariesByRequestId\[request\.id\]/);
    assert.match(listSource, /<PrintRequestCard[\s\S]*summary=\{summary\}/);
    assert.match(cardSource, /summary: PrintRequestItemSummary/);
    assert.match(cardSource, /summary\.uniqueDesignCount/);
    assert.match(cardSource, /summary\.totalQuantity/);
    assert.doesNotMatch(cardSource, /request\.itemCount/);
  });

  it('uses the canonical live summary for both detail header counts', () => {
    assert.match(detailSource, /buildPrintRequestItemSummaries/);
    assert.match(detailSource, /const requestSummary =/);
    assert.match(detailSource, /requestSummary\.uniqueDesignCount/);
    assert.match(detailSource, /const printCountLabel = `\$\{requestSummary\.totalQuantity\} print/);
    assert.doesNotMatch(detailSource, /const printCountLabel = `\$\{totalPrintCount\}/);
  });

  it('uses the canonical remaining summary for queue-to-show copy', () => {
    assert.match(queueModalSource, /buildPrintRequestItemSummaries/);
    assert.match(queueModalSource, /const remainingRequestSummary = useMemo/);
    assert.match(queueModalSource, /remainingRequestSummary\.uniqueDesignCount/);
    assert.match(queueModalSource, /remainingRequestSummary\.totalQuantity/);
    assert.doesNotMatch(queueModalSource, /remainingEntries\.length/);
  });

  it('uses live summaries for the continuable-request picker', () => {
    assert.match(continuableModalSource, /summariesByRequestId/);
    assert.match(continuableModalSource, /summary\.uniqueDesignCount/);
    assert.doesNotMatch(continuableModalSource, /request\.itemCount/);
  });
});
