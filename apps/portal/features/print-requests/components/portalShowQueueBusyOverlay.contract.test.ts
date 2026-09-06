import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

describe('Portal show queue/unqueue busy overlay', () => {
  it('shows a non-dismissible busy overlay while adding to a show', () => {
    const source = readFileSync(
      'apps/portal/features/print-requests/components/PortalQueueToShowModal.tsx',
      'utf8',
    );
    assert.match(source, /PortalBusyOverlay/);
    assert.match(source, /isOpen=\{isBusy\}/);
    assert.match(source, /Adding to show/);
    assert.doesNotMatch(source, /Updating show capacity/);
  });

  it('shows a non-dismissible busy overlay while removing from a show', () => {
    const source = readFileSync(
      'apps/portal/features/print-requests/components/PortalUnqueueFromShowConfirmModal.tsx',
      'utf8',
    );
    assert.match(source, /PortalBusyOverlay/);
    assert.match(source, /isOpen=\{isOpen && isSubmitting\}/);
    assert.match(source, /Removing from show/);
  });

  it('stacks the busy overlay above bidding acknowledgment', () => {
    const css = readFileSync('apps/portal/styles/shell.css', 'utf8');
    assert.match(css, /\.portal-busy-overlay \{[\s\S]*z-index:\s*calc\(var\(--z-modal,\s*40\)\s*\+\s*6\)/);
    assert.match(
      css,
      /\.portal-bidding-ack-overlay \{[\s\S]*z-index:\s*calc\(var\(--z-modal,\s*40\)\s*\+\s*4\)/,
    );
  });
});
