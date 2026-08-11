import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildAboutModalSnoozeUntilIso,
  dismissAboutModal,
  getAboutModalDismissedForeverStorageKey,
  getAboutModalSnoozeUntilStorageKey,
  isAboutModalSnoozed,
  shouldShowAboutModalOnVisit,
} from './portalAboutModalPreference.ts';

describe('portalAboutModalPreference', () => {
  const store = new Map<string, string>();

  function installMemoryStorage(): void {
    store.clear();
    const memoryStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    };
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { localStorage: memoryStorage },
      writable: true,
    });
  }

  it('normal dismiss snoozes for 24 hours and can reappear after', () => {
    installMemoryStorage();
    const now = Date.parse('2026-08-10T12:00:00.000Z');
    dismissAboutModal({ dontShowAgain: false, nowMs: now });
    assert.equal(shouldShowAboutModalOnVisit(now + 1000), false);
    assert.equal(
      shouldShowAboutModalOnVisit(now + 24 * 60 * 60 * 1000 + 1),
      true,
    );
    assert.equal(store.has(getAboutModalSnoozeUntilStorageKey()), true);
    assert.equal(store.get(getAboutModalDismissedForeverStorageKey()), undefined);
  });

  it('dont show again suppresses indefinitely', () => {
    installMemoryStorage();
    const now = Date.parse('2026-08-10T12:00:00.000Z');
    dismissAboutModal({ dontShowAgain: true, nowMs: now });
    assert.equal(shouldShowAboutModalOnVisit(now), false);
    assert.equal(shouldShowAboutModalOnVisit(now + 365 * 24 * 60 * 60 * 1000), false);
    assert.equal(store.get(getAboutModalDismissedForeverStorageKey()), '1');
  });

  it('isAboutModalSnoozed handles invalid ISO as not snoozed', () => {
    assert.equal(isAboutModalSnoozed(Date.now(), 'not-a-date'), false);
    assert.equal(isAboutModalSnoozed(Date.now(), null), false);
  });

  it('buildAboutModalSnoozeUntilIso advances by 24h by default', () => {
    const now = Date.parse('2026-08-10T00:00:00.000Z');
    assert.equal(buildAboutModalSnoozeUntilIso(now), '2026-08-11T00:00:00.000Z');
  });

  it('localStorage failure fail-open (no throw)', () => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        localStorage: {
          getItem: () => {
            throw new Error('quota');
          },
          setItem: () => {
            throw new Error('quota');
          },
          removeItem: () => {
            throw new Error('quota');
          },
        },
      },
      writable: true,
    });
    assert.doesNotThrow(() => {
      dismissAboutModal({ dontShowAgain: true });
      dismissAboutModal({ dontShowAgain: false, nowMs: Date.now() });
      shouldShowAboutModalOnVisit(Date.now());
    });
  });
});
