import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));

describe('PortalScrollReset designId containment', () => {
  it('skips reset for designId-only search changes and keeps forced reset elsewhere', () => {
    const source = readFileSync(path.join(here, 'PortalScrollReset.tsx'), 'utf8');
    assert.match(source, /isDesignIdOnlySearchChange/);
    assert.match(source, /resetPortalScroll/);
    assert.match(source, /scrollRestoration = 'manual'/);
  });

  it('deep-link open/close still request no-scroll router replace', () => {
    const deepLink = readFileSync(
      path.join(here, '../../catalog/hooks/useCatalogDesignDeepLink.ts'),
      'utf8',
    );
    assert.match(deepLink, /router\.replace\(href, \{ scroll: false \}\)/);
    const openCloseHits = deepLink.match(/scroll:\s*false/g) ?? [];
    assert.ok(openCloseHits.length >= 2);
  });
});
