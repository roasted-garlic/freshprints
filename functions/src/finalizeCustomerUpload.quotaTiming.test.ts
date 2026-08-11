import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)));

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8');
}

describe('finalizeCustomerUpload donation quota charge timing', () => {
  it('charges finalizeImage quota only after processed outputs succeed (not at finalize start)', () => {
    const source = read('finalizeCustomerUpload.ts');
    const leaseIdx = source.indexOf('acquireFinalizeLease');
    const chargeIdx = source.indexOf('chargeDailyQuota(customerUid, "finalizeImage"');
    const saveIdx = source.indexOf('saveCustomerUploadProcessedOutputs');
    assert.ok(leaseIdx > 0);
    assert.ok(chargeIdx > 0);
    assert.ok(saveIdx > 0);
    assert.ok(
      chargeIdx > saveIdx,
      'chargeDailyQuota must run after saveCustomerUploadProcessedOutputs',
    );
    assert.ok(chargeIdx > leaseIdx);
  });
});
