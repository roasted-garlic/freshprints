import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildPortalLoginHref,
  buildPortalLoginHrefForPath,
  buildPortalLoginRequiredHref,
  redirectToPortalLogin,
  redirectToPortalLoginRequired,
} from './requirePortalLogin';

describe('requirePortalLogin', () => {
  it('builds a safe login href with returnTo', () => {
    assert.equal(
      buildPortalLoginHref('/catalog?designId=abc'),
      '/login?returnTo=%2Fcatalog%3FdesignId%3Dabc',
    );
  });

  it('builds login-required interstitial href', () => {
    assert.equal(
      buildPortalLoginRequiredHref('/requests/artwork'),
      '/login-required?returnTo=%2Frequests%2Fartwork',
    );
  });

  it('falls back to home when returnTo is empty', () => {
    assert.equal(buildPortalLoginHref(''), '/login');
    assert.equal(buildPortalLoginHref('   '), '/login');
  });

  it('builds SSR-safe login href from explicit pathname', () => {
    assert.equal(
      buildPortalLoginHrefForPath('/shows/Lq2RL43xhDoILyPMuL6u'),
      '/login?returnTo=%2Fshows%2FLq2RL43xhDoILyPMuL6u',
    );
  });

  it('pushes login and returns true for early-return callers', () => {
    const pushes: string[] = [];
    const result = redirectToPortalLogin(
      { push: (href) => pushes.push(href) },
      '/favorites',
    );
    assert.equal(result, true);
    assert.deepEqual(pushes, ['/login?returnTo=%2Ffavorites']);
  });

  it('pushes login-required and returns true', () => {
    const pushes: string[] = [];
    const result = redirectToPortalLoginRequired(
      { push: (href) => pushes.push(href) },
      '/custom-designs',
    );
    assert.equal(result, true);
    assert.deepEqual(pushes, ['/login-required?returnTo=%2Fcustom-designs']);
  });
});
