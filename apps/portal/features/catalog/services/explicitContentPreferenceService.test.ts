import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import {
  EXPLICIT_CONTENT_PREFERENCE_STORAGE_KEY,
  explicitContentPreferenceService,
} from './explicitContentPreferenceService';

function createMemoryLocalStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}

describe('explicitContentPreferenceService', () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    (globalThis as { window?: unknown }).window = {
      localStorage: createMemoryLocalStorage(),
    };
  });

  afterEach(() => {
    (globalThis as { window?: unknown }).window = originalWindow;
  });

  it('defaults to false (censor) when nothing is stored', () => {
    assert.equal(explicitContentPreferenceService.getStoredShowExplicitContent(), false);
  });

  it('stores and reads back true', () => {
    explicitContentPreferenceService.storeShowExplicitContent(true);
    assert.equal(explicitContentPreferenceService.getStoredShowExplicitContent(), true);
    assert.equal(
      window.localStorage.getItem(EXPLICIT_CONTENT_PREFERENCE_STORAGE_KEY),
      'true',
    );
  });

  it('stores and reads back false explicitly', () => {
    explicitContentPreferenceService.storeShowExplicitContent(true);
    explicitContentPreferenceService.storeShowExplicitContent(false);
    assert.equal(explicitContentPreferenceService.getStoredShowExplicitContent(), false);
  });

  it('treats any non-"true" stored value as censor (fails closed)', () => {
    window.localStorage.setItem(EXPLICIT_CONTENT_PREFERENCE_STORAGE_KEY, 'garbage');
    assert.equal(explicitContentPreferenceService.getStoredShowExplicitContent(), false);
  });
});
