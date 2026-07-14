import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildArtworkQualityModalSnoozeUntilIso,
  getArtworkQualityModalSnoozeStorageKey,
  isArtworkQualityModalSnoozed,
} from './artworkQualityModalSnooze';

describe('artworkQualityModalSnooze', () => {
  it('uses a stable portal localStorage key', () => {
    assert.equal(
      getArtworkQualityModalSnoozeStorageKey(),
      'fresh-prints-portal-artwork-quality-modal-snooze-until',
    );
  });

  it('treats missing or invalid snooze as not snoozed', () => {
    const now = Date.parse('2026-07-13T12:00:00.000Z');
    assert.equal(isArtworkQualityModalSnoozed(now, null), false);
    assert.equal(isArtworkQualityModalSnoozed(now, undefined), false);
    assert.equal(isArtworkQualityModalSnoozed(now, 'not-a-date'), false);
  });

  it('is snoozed while before the until timestamp and not after', () => {
    const now = Date.parse('2026-07-13T12:00:00.000Z');
    const until = '2026-07-14T12:00:00.000Z';
    assert.equal(isArtworkQualityModalSnoozed(now, until), true);
    assert.equal(isArtworkQualityModalSnoozed(Date.parse(until), until), false);
    assert.equal(isArtworkQualityModalSnoozed(Date.parse(until) + 1, until), false);
  });

  it('builds an ISO snooze timestamp 24 hours ahead by default', () => {
    const now = Date.parse('2026-07-13T12:00:00.000Z');
    assert.equal(buildArtworkQualityModalSnoozeUntilIso(now), '2026-07-14T12:00:00.000Z');
  });
});
