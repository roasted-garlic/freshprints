import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

describe('Portal print request item newest-first display', () => {
  const serviceSource = readFileSync(
    resolve(import.meta.dirname, 'services/portalPrintRequestService.ts'),
    'utf8',
  );
  const detailSource = readFileSync(
    resolve(import.meta.dirname, 'hooks/usePrintRequestDetail.ts'),
    'utf8',
  );
  const addFlowSource = readFileSync(
    resolve(import.meta.dirname, 'hooks/useAddDesignToRequestFlow.ts'),
    'utf8',
  );
  const attachSource = readFileSync(
    resolve(process.cwd(), 'functions/src/confirmCustomerUploadsAndAttachToRequest.ts'),
    'utf8',
  );

  it('sorts list and live item loads newest-first at the service boundary', () => {
    assert.match(serviceSource, /sortPrintRequestItemsNewestFirst/);
    assert.match(
      serviceSource,
      /subscribePrintRequestItems[\s\S]*sortPrintRequestItemsNewestFirst\(/,
    );
    assert.match(
      serviceSource,
      /listPrintRequestItems[\s\S]*sortPrintRequestItemsNewestFirst\(/,
    );
  });

  it('keeps the detail cart signature order-aware', () => {
    const signatureMatch = detailSource.match(
      /function workingItemsSignature\([\s\S]*?\n\}/,
    );
    assert.ok(signatureMatch, 'workingItemsSignature must exist');
    assert.doesNotMatch(signatureMatch[0], /\.sort\(/);
    assert.match(signatureMatch[0], /item\.sortOrder \?\? ''/);
  });

  it('assigns sortOrder on optimistic catalog adds and upload attaches', () => {
    assert.match(addFlowSource, /resolveNextPrintRequestItemSortOrder\(items\)/);
    assert.match(attachSource, /resolveNextPrintRequestItemSortOrder/);
    assert.match(attachSource, /sortOrder,/);
  });
});
