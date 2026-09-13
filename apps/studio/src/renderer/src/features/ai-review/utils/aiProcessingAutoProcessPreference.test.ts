import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  readAiProcessingAutoProcessPreference,
  writeAiProcessingAutoProcessPreference,
} from "./aiProcessingAutoProcessPreference";

const KEY = "fresh-prints.ai-processing.auto-process";

function installLocalStorageMock(): Map<string, string> {
  const store = new Map<string, string>();
  const localStorage = {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
  };
  (globalThis as { window?: { localStorage: typeof localStorage } }).window = {
    localStorage,
  };
  return store;
}

describe("aiProcessingAutoProcessPreference", () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = installLocalStorageMock();
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it("defaults ON when unset", () => {
    store.delete(KEY);
    assert.equal(readAiProcessingAutoProcessPreference(), true);
  });

  it("reads explicit false", () => {
    store.set(KEY, "false");
    assert.equal(readAiProcessingAutoProcessPreference(), false);
  });

  it("reads explicit true", () => {
    store.set(KEY, "true");
    assert.equal(readAiProcessingAutoProcessPreference(), true);
  });

  it("persists writes", () => {
    writeAiProcessingAutoProcessPreference(false);
    assert.equal(store.get(KEY), "false");
    writeAiProcessingAutoProcessPreference(true);
    assert.equal(store.get(KEY), "true");
  });
});
