import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  resolveCanShowUnqueueFromShowCta,
  resolveStuckActiveNeedsEditingHeal,
} from './printRequestDetailUnqueueUi';

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

describe('resolveStuckActiveNeedsEditingHeal', () => {
  const base = {
    isEditable: false,
    requestStatus: 'active',
    listTab: 'working' as const,
    isPortalCustomerOrigin: true,
    hasOtherPortalEditableContinuableRequest: false,
    hasScheduledShows: false,
    hasActiveAllocations: false,
  };

  it('heals only when active with no schedules and no allocations', () => {
    assert.equal(resolveStuckActiveNeedsEditingHeal(base), true);
  });

  it('does not heal when a scheduled show is present (freshly queued)', () => {
    assert.equal(
      resolveStuckActiveNeedsEditingHeal({
        ...base,
        hasScheduledShows: true,
      }),
      false,
    );
  });

  it('does not heal when active allocations remain', () => {
    assert.equal(
      resolveStuckActiveNeedsEditingHeal({
        ...base,
        hasActiveAllocations: true,
      }),
      false,
    );
  });

  it('does not heal when list tab is queued', () => {
    assert.equal(
      resolveStuckActiveNeedsEditingHeal({
        ...base,
        listTab: 'queued',
      }),
      false,
    );
  });
});
