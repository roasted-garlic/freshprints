import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  AI_REVIEW_INBOX_SORT_PREFERENCE_KEY,
  readAiReviewInboxSortPreference,
  writeAiReviewInboxSortPreference,
} from "./aiReviewInboxSortPreference";

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

describe("aiReviewInboxSortPreference", () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = installLocalStorageMock();
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it("leaves the existing default behavior when unset", () => {
    assert.equal(readAiReviewInboxSortPreference(), undefined);
  });

  it("ignores invalid persisted values", () => {
    store.set(AI_REVIEW_INBOX_SORT_PREFERENCE_KEY, "random");
    assert.equal(readAiReviewInboxSortPreference(), undefined);
  });

  it("persists both directions across subsequent reads", () => {
    writeAiReviewInboxSortPreference("oldest");
    assert.equal(store.get(AI_REVIEW_INBOX_SORT_PREFERENCE_KEY), "oldest");
    assert.equal(readAiReviewInboxSortPreference(), "oldest");

    writeAiReviewInboxSortPreference("newest");
    assert.equal(store.get(AI_REVIEW_INBOX_SORT_PREFERENCE_KEY), "newest");
    assert.equal(readAiReviewInboxSortPreference(), "newest");
  });
});
