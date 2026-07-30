/**
 * Regression for item 8 (owner-corrected in Plan Section 19.3): the historical/catalog-reuse
 * button must read "Request Again" (title case, both visible label and aria-label) with a
 * repeat icon, and must only ever render inside the existing showCatalogReuse gate
 * (readOnly && catalogDesignId && catalogReuseDesign !== undefined) — i.e. only for a
 * historical/submitted request's item, never on an active working-request item.
 *
 * PortalPrintRequestItemCard.tsx is a presentational component with no exported pure logic
 * worth extracting for this specific check (the gating condition itself is unchanged from
 * before this fix and is a simple boolean expression already visible in source). Per this
 * repo's no-DOM-rendering test convention, this is verified via static source inspection, the
 * same pattern used in PortalPrintRequestContext.boundary.test.ts and
 * usePrintRequestDetail.test.ts.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, 'PortalPrintRequestItemCard.tsx'), 'utf8');

describe('PortalPrintRequestItemCard — "Request Again" historical reuse button (item 8, Section 19.3)', () => {
  it('renders "Request Again" text, not "Print again" or "Add to request"', () => {
    assert.match(source, /Request Again/);
    assert.equal(/>\s*Print again\s*</.test(source), false);
    assert.equal(/>\s*Add to request\s*</.test(source), false);
  });

  it('uses a repeat-style icon (Lucide Repeat) alongside the label', () => {
    assert.match(source, /import\s*\{\s*Repeat\s*\}\s*from\s*'lucide-react';/);
    assert.match(source, /<Repeat\s+aria-hidden\s+size=\{14\}\s*\/>/);
  });

  it('sets an explicit title-case aria-label distinct from the visible short label', () => {
    assert.match(source, /aria-label=\{`Request \$\{title\} Again`\}/);
  });

  it('the reuse button stays inside the existing historical-only showCatalogReuse gate', () => {
    assert.match(
      source,
      /const showCatalogReuse\s*=\s*\r?\n\s*readOnly && catalogDesignId\.length > 0 && catalogReuseDesign !== undefined;/,
    );
    const reuseBlockIndex = source.indexOf('showCatalogReuse ? (');
    const requestAgainIndex = source.indexOf('Request Again');
    assert.ok(reuseBlockIndex >= 0 && requestAgainIndex >= 0);
    // "Request Again" must appear after the showCatalogReuse-gated block starts, not in the
    // always-rendered active-working-request editors section below it.
    assert.ok(requestAgainIndex > reuseBlockIndex);
  });

  it('does not change behavior on active (non-historical) working-request items: onAddToRequest / addDesignFlow.addDesign wiring is unchanged', () => {
    assert.match(source, /onClick=\{\(\) => onAddToRequest\?\.\(catalogReuseDesign\)\}/);
  });
});
