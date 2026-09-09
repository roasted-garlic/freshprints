import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolvePortalPostAuthPathForSession } from './portalReturnUrl';

describe('Portal admin post-auth destinations', () => {
  it('defaults an admin session to the Show Queue', () => {
    assert.equal(resolvePortalPostAuthPathForSession('/', 'admin'), '/admin/show-queue');
    assert.equal(resolvePortalPostAuthPathForSession('/catalog', 'admin'), '/admin/show-queue');
  });

  it('preserves only the safe Show Queue return path for admins', () => {
    assert.equal(resolvePortalPostAuthPathForSession('/admin/show-queue', 'admin'), '/admin/show-queue');
    assert.equal(resolvePortalPostAuthPathForSession('/admin/show-queue?focus=1', 'admin'), '/admin/show-queue?focus=1');
    assert.equal(resolvePortalPostAuthPathForSession('/admin/show-queue-evil', 'admin'), '/admin/show-queue');
  });
});
