import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  AI_PROCESSING_AUTO_ADVANCE_KEY,
  readAiProcessingAutoAdvancePreference,
  writeAiProcessingAutoAdvancePreference,
} from "./aiProcessingQueuePreferences";

type StorageMock = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

function installStorageMock({
  local = {},
  session = {},
}: {
  local?: Record<string, string>;
  session?: Record<string, string>;
} = {}): { local: Map<string, string>; session: Map<string, string> } {
  const localStore = new Map(Object.entries(local));
  const sessionStore = new Map(Object.entries(session));

  const createStorage = (store: Map<string, string>): StorageMock => ({
    getItem(key) {
      return store.get(key) ?? null;
    },
    setItem(key, value) {
      store.set(key, value);
    },
    removeItem(key) {
      store.delete(key);
    },
  });

  (globalThis as { window?: { localStorage: StorageMock; sessionStorage: StorageMock } }).window = {
    localStorage: createStorage(localStore),
    sessionStorage: createStorage(sessionStore),
  };

  return { local: localStore, session: sessionStore };
}

describe("aiProcessingAutoAdvancePreference", () => {
  beforeEach(() => {
    installStorageMock();
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it("defaults ON when no valid persisted preference exists", () => {
    assert.equal(readAiProcessingAutoAdvancePreference(), true);
  });

  it("persists explicit changes in localStorage across subsequent reads", () => {
    const stores = installStorageMock();

    writeAiProcessingAutoAdvancePreference(false);
    assert.equal(stores.local.get(AI_PROCESSING_AUTO_ADVANCE_KEY), "false");
    assert.equal(readAiProcessingAutoAdvancePreference(), false);

    writeAiProcessingAutoAdvancePreference(true);
    assert.equal(stores.local.get(AI_PROCESSING_AUTO_ADVANCE_KEY), "true");
    assert.equal(readAiProcessingAutoAdvancePreference(), true);
    assert.equal(stores.session.has(AI_PROCESSING_AUTO_ADVANCE_KEY), false);
  });

  it("migrates a valid legacy session value only when localStorage has no valid value", () => {
    const stores = installStorageMock({ session: { [AI_PROCESSING_AUTO_ADVANCE_KEY]: "false" } });

    assert.equal(readAiProcessingAutoAdvancePreference(), false);
    assert.equal(stores.local.get(AI_PROCESSING_AUTO_ADVANCE_KEY), "false");

    stores.session.set(AI_PROCESSING_AUTO_ADVANCE_KEY, "true");
    assert.equal(readAiProcessingAutoAdvancePreference(), false);
  });

  it("ignores invalid values and keeps the local preference independent of queue data", () => {
    const stores = installStorageMock({
      local: { [AI_PROCESSING_AUTO_ADVANCE_KEY]: "invalid" },
      session: { [AI_PROCESSING_AUTO_ADVANCE_KEY]: "also-invalid" },
    });

    assert.equal(readAiProcessingAutoAdvancePreference(), true);
    assert.equal(stores.local.get(AI_PROCESSING_AUTO_ADVANCE_KEY), "invalid");
  });
});
