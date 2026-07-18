import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { locationMatchesNotificationHref } from './locationMatchesNotificationHref';

describe('locationMatchesNotificationHref', () => {
  it('matches assisted deep links when required params are present', () => {
    const href = '/custom-designs?flow=assisted&step=status&detailTab=messages';
    const params = new URLSearchParams('flow=assisted&step=status&detailTab=messages');
    assert.equal(locationMatchesNotificationHref('/custom-designs', params, href), true);
  });

  it('allows extra search params on the current location', () => {
    const href = '/custom-designs?flow=assisted&step=status&detailTab=proofs';
    const params = new URLSearchParams('flow=assisted&step=status&detailTab=proofs&extra=1');
    assert.equal(locationMatchesNotificationHref('/custom-designs', params, href), true);
  });

  it('rejects mismatched pathname or detailTab', () => {
    const href = '/custom-designs?flow=assisted&step=status&detailTab=messages';
    assert.equal(
      locationMatchesNotificationHref(
        '/dashboard',
        new URLSearchParams('flow=assisted&step=status&detailTab=messages'),
        href,
      ),
      false,
    );
    assert.equal(
      locationMatchesNotificationHref(
        '/custom-designs',
        new URLSearchParams('flow=assisted&step=status&detailTab=proofs'),
        href,
      ),
      false,
    );
  });
});
