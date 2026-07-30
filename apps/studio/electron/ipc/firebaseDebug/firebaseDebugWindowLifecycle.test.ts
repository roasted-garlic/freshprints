import assert from "node:assert/strict";
import test from "node:test";

import {
  FirebaseDebugWindowLifecycle,
  type FirebaseDebugWindowLike,
} from "./firebaseDebugWindowLifecycle";

function fakeWindow(minimized = false): FirebaseDebugWindowLike & {
  calls: string[];
  destroyed: boolean;
} {
  return {
    calls: [],
    destroyed: false,
    close() { this.calls.push("close"); },
    focus() { this.calls.push("focus"); },
    isDestroyed() { return this.destroyed; },
    isMinimized() { return minimized; },
    restore() { this.calls.push("restore"); },
    show() { this.calls.push("show"); },
  };
}

test("creates only one window and focuses the existing instance", () => {
  const lifecycle = new FirebaseDebugWindowLifecycle();
  const first = fakeWindow();
  let creates = 0;
  lifecycle.open(() => { creates += 1; return first; });
  const secondOpen = lifecycle.open(() => { creates += 1; return fakeWindow(); });

  assert.equal(creates, 1);
  assert.equal(secondOpen.created, false);
  assert.deepEqual(first.calls, ["show", "focus"]);
});

test("restores a minimized window before focusing", () => {
  const lifecycle = new FirebaseDebugWindowLifecycle();
  const window = fakeWindow(true);
  lifecycle.open(() => window);
  lifecycle.open(() => fakeWindow());

  assert.deepEqual(window.calls, ["restore", "show", "focus"]);
});

test("clearing allows a new window to be opened", () => {
  const lifecycle = new FirebaseDebugWindowLifecycle();
  const first = fakeWindow();
  lifecycle.open(() => first);
  lifecycle.clear(first);
  const reopened = lifecycle.open(() => fakeWindow());

  assert.equal(reopened.created, true);
  assert.notEqual(reopened.window, first);
});

test("closing the lifecycle closes only the debug window and clears its reference", () => {
  const lifecycle = new FirebaseDebugWindowLifecycle();
  const window = fakeWindow();
  lifecycle.open(() => window);
  lifecycle.close();

  assert.deepEqual(window.calls, ["close"]);
  assert.equal(lifecycle.get(), null);
});
