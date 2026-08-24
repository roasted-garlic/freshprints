import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildPortalAuthHref,
  getCurrentPortalPath,
  getPortalReturnToFromSearch,
  getSafePortalReturnTo,
  resolvePortalPostAuthPath,
} from './portalReturnUrl';

describe('portalReturnUrl', () => {
  it('accepts local paths with query strings and fragments', () => {
    assert.equal(
      getSafePortalReturnTo('/custom-designs?flow=assisted&step=status#proof'),
      '/custom-designs?flow=assisted&step=status#proof',
    );
    assert.equal(
      getCurrentPortalPath({
        pathname: '/requests/request-1',
        search: '?tab=history',
      }),
      '/requests/request-1?tab=history',
    );
  });

  it('rejects external, protocol-relative, auth-loop, and malformed targets', () => {
    const invalidTargets = [
      'https://evil.example/path',
      '//evil.example/path',
      '/\\evil.example/path',
      '/%5cevil.example/path',
      '/%255cevil.example/path',
      '/%2f%2fevil.example/path',
      '/%252f%252fevil.example/path',
      '/login',
      '/login?returnTo=%2Frequests',
      '/register',
      '/complete-profile',
      '/complete-profile/finish',
      '/requests/%',
      '/requests\u0000',
      ' /requests',
      '/requests ',
      '',
    ];

    for (const target of invalidTargets) {
      assert.equal(getSafePortalReturnTo(target), '/', target);
    }
  });

  it('reads and writes one encoded returnTo query parameter', () => {
    const href = buildPortalAuthHref('/login', '/custom-designs?flow=assisted&step=status');
    assert.equal(
      href,
      '/login?returnTo=%2Fcustom-designs%3Fflow%3Dassisted%26step%3Dstatus',
    );
    assert.equal(
      getPortalReturnToFromSearch(href.slice(href.indexOf('?'))),
      '/custom-designs?flow=assisted&step=status',
    );
    assert.equal(buildPortalAuthHref('/complete-profile', 'https://evil.example'), '/complete-profile');
  });

  it('maps share design landings to catalog deep links after auth', () => {
    assert.equal(
      resolvePortalPostAuthPath('/share/design/Ab2dBnwdAmWG6ivXpzIC'),
      '/catalog?designId=Ab2dBnwdAmWG6ivXpzIC',
    );
    assert.equal(resolvePortalPostAuthPath('/catalog?designId=abc'), '/catalog?designId=abc');
    assert.equal(
      resolvePortalPostAuthPath('/shows/Lq2RL43xhDoILyPMuL6u'),
      '/shows/Lq2RL43xhDoILyPMuL6u',
    );
  });

  it('builds register auth href with returnTo', () => {
    assert.equal(
      buildPortalAuthHref('/register', '/shows/show-123'),
      '/register?returnTo=%2Fshows%2Fshow-123',
    );
  });
});
