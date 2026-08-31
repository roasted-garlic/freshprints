import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveCanShowUnqueueFromShowCta } from './printRequestDetailUnqueueUi';

describe('resolveCanShowUnqueueFromShowCta', () => {
  it('shows CTA for eligible queued requests with a primary show', () => {
    assert.equal(
      resolveCanShowUnqueueFromShowCta({
        isEditable: false,
        unqueueEligibility: { eligible: true },
        hasPrimaryScheduledShow: true,
      }),
      true,
    );
  });

  it('hides CTA while the request is still editable', () => {
    assert.equal(
      resolveCanShowUnqueueFromShowCta({
        isEditable: true,
        unqueueEligibility: { eligible: true },
        hasPrimaryScheduledShow: true,
      }),
      false,
    );
  });

  it('hides CTA when unqueue eligibility fails', () => {
    assert.equal(
      resolveCanShowUnqueueFromShowCta({
        isEditable: false,
        unqueueEligibility: { eligible: false },
        hasPrimaryScheduledShow: true,
      }),
      false,
    );
  });

  it('hides CTA when no primary show schedule is available', () => {
    assert.equal(
      resolveCanShowUnqueueFromShowCta({
        isEditable: false,
        unqueueEligibility: { eligible: true },
        hasPrimaryScheduledShow: false,
      }),
      false,
    );
  });
});
