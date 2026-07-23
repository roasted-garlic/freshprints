import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isPortalPublicBrowsePath } from './portalPublicBrowsePath';

describe('isPortalPublicBrowsePath', () => {
  it('allows home, catalog, help, and design share browse paths', () => {
    assert.equal(isPortalPublicBrowsePath('/'), true);
    assert.equal(isPortalPublicBrowsePath('/catalog'), true);
    assert.equal(isPortalPublicBrowsePath('/catalog/library'), true);
    assert.equal(isPortalPublicBrowsePath('/catalog/anything'), true);
    assert.equal(isPortalPublicBrowsePath('/help'), true);
    assert.equal(isPortalPublicBrowsePath('/help/'), true);
    assert.equal(isPortalPublicBrowsePath('/share/design/abc123'), true);
    assert.equal(isPortalPublicBrowsePath('/share/design'), true);
  });

  it('rejects donate and mutation-primary routes (donate requires login)', () => {
    const protectedPaths = [
      '/donate',
      '/donate/',
      '/favorites',
      '/requests',
      '/requests/artwork',
      '/requests/abc',
      '/custom-designs',
      '/custom-designs?flow=find',
      '/account',
      '/dashboard',
      '/login',
      null,
      undefined,
      '',
    ];

    for (const path of protectedPaths) {
      assert.equal(isPortalPublicBrowsePath(path), false, String(path));
    }
  });
});
