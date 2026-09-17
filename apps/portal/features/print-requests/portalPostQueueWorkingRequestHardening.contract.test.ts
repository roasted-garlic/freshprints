import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

describe('post-queue Working request targeting hardening', () => {
  it('validates the ensured Working id before reuse', () => {
    const source = readFileSync(
      join(here, 'context/PortalPrintRequestContext.tsx'),
      'utf8',
    );
    assert.match(source, /shouldTrustEnsuredWorkingRequestId/);
    assert.match(source, /filterPortalActiveEditablePrintRequests/);
    assert.match(source, /setSelectedWorkingRequestId\(null\)/);
  });

  it('cancels pending quantity flushes when Working ownership changes', () => {
    const source = readFileSync(
      join(here, 'hooks/useAddDesignToRequestFlow.ts'),
      'utf8',
    );
    assert.match(source, /previousWorkingRequestIdForFlushRef/);
    assert.match(source, /isPortalPrintRequestNotContinuableError/);
    assert.match(source, /allowContinuableRetry:\s*false/);
  });
});
