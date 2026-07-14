import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { needsPortalCustomerProfileCompletion } from './auth.types';

describe('needsPortalCustomerProfileCompletion', () => {
  it('is true for missing profile bootstrap states', () => {
    assert.equal(needsPortalCustomerProfileCompletion('missing-profile'), true);
    assert.equal(needsPortalCustomerProfileCompletion('missing-customer'), true);
  });

  it('is false for ready and blocked states', () => {
    assert.equal(needsPortalCustomerProfileCompletion('ready'), false);
    assert.equal(needsPortalCustomerProfileCompletion('unauthenticated'), false);
    assert.equal(needsPortalCustomerProfileCompletion('staff-account'), false);
    assert.equal(needsPortalCustomerProfileCompletion('inactive'), false);
  });
});
