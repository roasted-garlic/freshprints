import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

describe('portalPrintRequestService parking field mapping contract', () => {
  const source = readFileSync(
    resolve(import.meta.dirname, 'services/portalPrintRequestService.ts'),
    'utf8',
  );

  it('maps Continuable parking relationship fields from Firestore', () => {
    assert.match(source, /parkedByEditingRequestId\??:\s*unknown/);
    assert.match(source, /parksDraftPrintRequestId\??:\s*unknown/);
    assert.match(source, /parkedAt\??:\s*unknown/);
    assert.match(source, /parkedByEditingRequestId:\s*\n?\s*typeof data\.parkedByEditingRequestId/);
    assert.match(source, /parksDraftPrintRequestId:\s*\n?\s*typeof data\.parksDraftPrintRequestId/);
  });
});
