import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  buildArtworkQualityModalSnoozeUntilIso,
  dismissArtworkQualityModal,
  getArtworkQualityModalDismissedForeverStorageKey,
  getArtworkQualityModalSnoozeStorageKey,
  isArtworkQualityModalSnoozed,
  readArtworkQualityModalDismissedForever,
  shouldOpenArtworkQualityModalOnMount,
  writeArtworkQualityModalDismissedForever,
  writeArtworkQualityModalSnoozeUntil,
} from './artworkQualityModalSnooze';

const memory = new Map<string, string>();

function installMemoryLocalStorage(): void {
  memory.clear();
  const localStorageMock = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, String(value));
    },
    removeItem: (key: string) => {
      memory.delete(key);
    },
  };
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage: localStorageMock },
    writable: true,
  });
}

afterEach(() => {
  memory.clear();
  Reflect.deleteProperty(globalThis, 'window');
});

describe('artworkQualityModalSnooze', () => {
  it('uses stable portal localStorage keys', () => {
    assert.equal(
      getArtworkQualityModalDismissedForeverStorageKey(),
      'fresh-prints-portal-artwork-quality-modal-dismissed',
    );
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

  it('opens by default when no preference is stored', () => {
    installMemoryLocalStorage();
    assert.equal(shouldOpenArtworkQualityModalOnMount(), true);
  });

  it('does not open when forever dismissed', () => {
    installMemoryLocalStorage();
    writeArtworkQualityModalDismissedForever();
    assert.equal(readArtworkQualityModalDismissedForever(), true);
    assert.equal(shouldOpenArtworkQualityModalOnMount(), false);
  });

  it('dismissArtworkQualityModal writes forever only when dontShowAgain is true', () => {
    installMemoryLocalStorage();
    dismissArtworkQualityModal({ dontShowAgain: false });
    assert.equal(shouldOpenArtworkQualityModalOnMount(), true);
    dismissArtworkQualityModal({ dontShowAgain: true });
    assert.equal(shouldOpenArtworkQualityModalOnMount(), false);
  });

  it('honors remaining snooze when not forever dismissed', () => {
    installMemoryLocalStorage();
    const now = Date.parse('2026-07-13T12:00:00.000Z');
    writeArtworkQualityModalSnoozeUntil(buildArtworkQualityModalSnoozeUntilIso(now));
    assert.equal(shouldOpenArtworkQualityModalOnMount(now + 1000), false);
    assert.equal(shouldOpenArtworkQualityModalOnMount(now + TWENTY_FIVE_HOURS_MS), true);
  });

  it('fails open when forever key is malformed (not exactly 1)', () => {
    installMemoryLocalStorage();
    window.localStorage.setItem(getArtworkQualityModalDismissedForeverStorageKey(), 'yes');
    assert.equal(shouldOpenArtworkQualityModalOnMount(), true);
  });
});

const TWENTY_FIVE_HOURS_MS = 25 * 60 * 60 * 1000;
