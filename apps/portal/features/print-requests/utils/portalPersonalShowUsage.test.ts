import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildPortalPersonalShowUsage,
  resolveSelectedPortalPersonalShowUsage,
} from './portalPersonalShowUsage';

describe('buildPortalPersonalShowUsage', () => {
  it('formats zero, partial, and exhausted personal show usage', () => {
    assert.deepEqual(buildPortalPersonalShowUsage(0, 25), {
      used: 0, limit: 25, remaining: 25,
      usedLabel: 'Your print spots: 0 of 25 used',
      remainingLabel: '25 spots remaining',
    });
    assert.equal(buildPortalPersonalShowUsage(22, 25).remainingLabel, '3 spots remaining');
    assert.equal(buildPortalPersonalShowUsage(25, 25).remainingLabel, '0 spots remaining');
  });

  it('adds a successful optimistic quantity exactly once and clamps remaining', () => {
    assert.deepEqual(buildPortalPersonalShowUsage(22, 25, 3), {
      used: 25, limit: 25, remaining: 0,
      usedLabel: 'Your print spots: 25 of 25 used',
      remainingLabel: '0 spots remaining',
    });
    assert.equal(buildPortalPersonalShowUsage(25, 25, 3).remaining, 0);
  });
});

describe('resolveSelectedPortalPersonalShowUsage', () => {
  const shows = [
    { id: 'show-a', customerAllocatedQuantity: 22 },
    { id: 'show-b', customerAllocatedQuantity: 5 },
  ];

  it('switches selected shows without leaking usage or optimistic state', () => {
    const pending = new Map([['show-a', 3]]);
    assert.equal(resolveSelectedPortalPersonalShowUsage({
      shows, selectedShowId: 'show-a', limit: 25, pendingSuccessfulByShowId: pending,
    })?.used, 25);
    assert.equal(resolveSelectedPortalPersonalShowUsage({
      shows, selectedShowId: 'show-b', limit: 25, pendingSuccessfulByShowId: pending,
    })?.used, 5);
  });

  it('models failed submission cleanup and modal reopen from server state', () => {
    const optimistic = new Map([['show-a', 3]]);
    assert.equal(resolveSelectedPortalPersonalShowUsage({
      shows, selectedShowId: 'show-a', limit: 25, pendingSuccessfulByShowId: optimistic,
    })?.used, 25);
    assert.equal(resolveSelectedPortalPersonalShowUsage({
      shows, selectedShowId: 'show-a', limit: 25,
    })?.used, 22);
    assert.equal(resolveSelectedPortalPersonalShowUsage({
      shows: [{ id: 'show-a', customerAllocatedQuantity: 25 }],
      selectedShowId: 'show-a',
      limit: 25,
    })?.used, 25);
  });

  it('keeps personal usage copy distinct from show-wide capacity copy', () => {
    const usage = resolveSelectedPortalPersonalShowUsage({
      shows, selectedShowId: 'show-a', limit: 25,
    });
    assert.equal(usage?.usedLabel, 'Your print spots: 22 of 25 used');
    assert.notEqual(usage?.usedLabel, '22 of 25 show spots used');
  });

  it('omits remainingLabel for a non-allocatable (historical/full/past) show while keeping usedLabel (Plan Section 29.6)', () => {
    const historicalShows = [
      { id: 'finished-show', customerAllocatedQuantity: 20, isAllocatable: false },
    ];
    const usage = resolveSelectedPortalPersonalShowUsage({
      shows: historicalShows, selectedShowId: 'finished-show', limit: 25,
    });
    assert.equal(usage?.usedLabel, 'Your print spots: 20 of 25 used', 'used count remains for historical reference');
    assert.equal(usage?.remainingLabel, undefined, 'remaining-spots invitation must not display on a non-allocatable show');
  });

  it('keeps remainingLabel for an open allocatable show', () => {
    const openShows = [{ id: 'open-show', customerAllocatedQuantity: 20, isAllocatable: true }];
    const usage = resolveSelectedPortalPersonalShowUsage({
      shows: openShows, selectedShowId: 'open-show', limit: 25,
    });
    assert.equal(usage?.remainingLabel, '5 spots remaining');
  });

  it('buildPortalPersonalShowUsage omits remainingLabel only when isAllocatable is explicitly false', () => {
    assert.equal(buildPortalPersonalShowUsage(20, 25, 0, false).remainingLabel, undefined);
    assert.equal(buildPortalPersonalShowUsage(20, 25, 0, true).remainingLabel, '5 spots remaining');
    assert.equal(buildPortalPersonalShowUsage(20, 25).remainingLabel, '5 spots remaining', 'defaults to allocatable for backward compatibility');
  });

  it('uses the customer-show cap for personal usage, not the per-request limit', () => {
    const usage = resolveSelectedPortalPersonalShowUsage({
      shows: [{ id: 'show-a', customerAllocatedQuantity: 18 }],
      selectedShowId: 'show-a',
      limit: 30,
    });
    assert.equal(usage?.remaining, 12);
    assert.equal(usage?.usedLabel, 'Your print spots: 18 of 30 used');
  });
});
