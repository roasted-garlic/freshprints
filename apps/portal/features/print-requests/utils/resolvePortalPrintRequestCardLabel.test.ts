import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolvePortalPrintRequestCardLabel } from './resolvePortalPrintRequestCardLabel';

describe('resolvePortalPrintRequestCardLabel', () => {
  it('shows Editing on the Editing tab', () => {
    assert.equal(
      resolvePortalPrintRequestCardLabel({
        listTab: 'editing',
        requestStatus: 'editing',
        progressLabel: 'Working',
      }),
      'Editing',
    );
  });

  it('shows Editing for an editing request grouped in Working (legacy)', () => {
    assert.equal(
      resolvePortalPrintRequestCardLabel({
        listTab: 'working',
        requestStatus: 'editing',
        progressLabel: 'Working',
      }),
      'Editing',
    );
  });

  it('preserves queue-derived labels for other states', () => {
    assert.equal(
      resolvePortalPrintRequestCardLabel({
        listTab: 'queued',
        requestStatus: 'active',
        progressLabel: 'Queued',
      }),
      'Queued',
    );
  });
});

