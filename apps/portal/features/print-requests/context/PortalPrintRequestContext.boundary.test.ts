/**
 * Regression: PortalPrintRequestContext must not import CurrentRequestDrawer.
 * Importing the drawer from the context module creates a circular dependency
 * (Context → Drawer → usePortalPrintRequests → Context) that can leave the
 * drawer export undefined and crash authenticated Portal shell render.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const contextSourcePath = join(here, 'PortalPrintRequestContext.tsx');

describe('PortalPrintRequestContext module boundaries', () => {
  it('does not import CurrentRequestDrawer (avoids circular import crash)', () => {
    const source = readFileSync(contextSourcePath, 'utf8');
    assert.equal(
      /import\s*\{[^}]*CurrentRequestDrawer[^}]*\}\s*from/.test(source),
      false,
      'PortalPrintRequestContext.tsx must not import CurrentRequestDrawer',
    );
    assert.equal(
      /from\s+['"].*CurrentRequestDrawer['"]/.test(source),
      false,
      'PortalPrintRequestContext.tsx must not import from CurrentRequestDrawer module',
    );
  });
});
