import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isPortalAppShellRoute } from './isPortalAppShellRoute';

describe('isPortalAppShellRoute', () => {
  it('treats Upcoming Shows list and gallery as shell routes', () => {
    assert.equal(isPortalAppShellRoute('/shows'), true);
    assert.equal(isPortalAppShellRoute('/shows/QNEwInNcttmdAsb95mQW'), true);
    assert.equal(isPortalAppShellRoute('/shows/'), true);
  });

  it('treats other app-shell browse and account routes as shell routes', () => {
    assert.equal(isPortalAppShellRoute('/'), true);
    assert.equal(isPortalAppShellRoute('/catalog'), true);
    assert.equal(isPortalAppShellRoute('/catalog/library'), true);
    assert.equal(isPortalAppShellRoute('/help'), true);
    assert.equal(isPortalAppShellRoute('/share/design/abc'), true);
    assert.equal(isPortalAppShellRoute('/dashboard'), true);
    assert.equal(isPortalAppShellRoute('/donate'), true);
    assert.equal(isPortalAppShellRoute('/requests'), true);
    assert.equal(isPortalAppShellRoute('/custom-designs'), true);
  });

  it('leaves auth and non-shell pages for floating PortalChrome', () => {
    assert.equal(isPortalAppShellRoute('/login'), false);
    assert.equal(isPortalAppShellRoute('/register'), false);
    assert.equal(isPortalAppShellRoute('/login-required'), false);
    assert.equal(isPortalAppShellRoute('/showsomething'), false);
  });
});
