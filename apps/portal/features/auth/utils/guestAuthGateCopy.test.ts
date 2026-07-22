import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveGuestAuthGateLead } from './guestAuthGateCopy';

describe('resolveGuestAuthGateLead', () => {
  it('uses donation-protection copy on /donate', () => {
    const lead = resolveGuestAuthGateLead('/donate');
    assert.match(lead, /sign in to donate/i);
    assert.match(lead, /spam or unwanted uploads/i);
    assert.match(lead, /browse all designs/i);
  });

  it('uses default browse copy on other gated routes', () => {
    const lead = resolveGuestAuthGateLead('/requests');
    assert.match(lead, /need an account for this part/i);
    assert.doesNotMatch(lead, /donate artwork/i);
  });
});
