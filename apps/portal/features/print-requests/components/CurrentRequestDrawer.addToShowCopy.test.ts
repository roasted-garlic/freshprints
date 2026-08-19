/**
 * Source-presence proof for Current Request add-to-show copy (plan 2026-08-18).
 * Drawer and review have no DOM harness here; these tests prevent the generic
 * "Review Request" drawer CTA and competing review-header browse buttons from
 * returning. They do not substitute for owner DEV QA.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const drawerSource = readFileSync(join(here, 'CurrentRequestDrawer.tsx'), 'utf8');
const detailSource = readFileSync(
  join(here, '../../../app/(app)/requests/[id]/PrintRequestDetailView.tsx'),
  'utf8',
);
const modalSource = readFileSync(join(here, 'PortalQueueToShowModal.tsx'), 'utf8');

describe('Current Request add-to-show copy', () => {
  it('drawer primary CTA is Review & Add to Show, not generic Review Request', () => {
    assert.match(drawerSource, /Review & Add to Show/);
    assert.equal(
      />\s*Review Request\s*</.test(drawerSource),
      false,
      'filled drawer CTA must not render Review Request',
    );
  });

  it('drawer includes the next-step helper above the primary CTA', () => {
    assert.match(
      drawerSource,
      /Next step: review your request, then add it to a show\./,
    );
  });

  it('Needs a show cue is gated to a non-empty working request', () => {
    assert.match(drawerSource, /workingRequest && !isEmpty/);
    assert.match(drawerSource, /Needs a show/);
  });

  it('review header opens the show picker as Add Request to Whatnot Show', () => {
    assert.match(detailSource, /Add Request to Whatnot Show/);
    assert.match(detailSource, /setIsQueueModalOpen\(true\)/);
    assert.equal(
      /Choose a Show/.test(detailSource),
      false,
      'review header uses the owner Whatnot show CTA, not Choose a Show',
    );
  });

  it('review header supporting copy states the show is the final step', () => {
    assert.match(
      detailSource,
      /When your request is ready, add it to a show to have your prints included\./,
    );
    assert.match(
      detailSource,
      /portal-request-detail-show-cta-hint[\s\S]*Final step: choose the show you want this request added to\./,
    );
  });

  it('empty review body still offers Upload Designs and Browse Design Library', () => {
    assert.match(detailSource, /No designs yet/);
    assert.match(detailSource, /Upload Designs/);
    assert.match(detailSource, /Browse Design Library/);
  });

  it('review header action area no longer includes Upload or Browse', () => {
    const headerMatch = detailSource.match(
      /<header className="portal-page-header portal-request-detail-header">[\s\S]*?<\/header>/,
    );
    assert.ok(headerMatch, 'expected the request-detail header block');
    assert.equal(/Upload Designs/.test(headerMatch[0]), false);
    assert.equal(/Browse Design Library/.test(headerMatch[0]), false);
    assert.match(headerMatch[0], /Add Request to Whatnot Show/);
    assert.match(
      headerMatch[0],
      /Add Request to Whatnot Show[\s\S]*Final step: choose the show you want this request added to\./,
    );
  });

  it('modal submit still performs add-to-show', () => {
    assert.match(modalSource, /\{isBusy \? 'Adding…' : 'Add to show'\}/);
  });
});
