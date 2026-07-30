import assert from "node:assert/strict";
import test from "node:test";

import {
  shouldWriteCurrentWebPushSubscription,
  WEB_PUSH_SIBLING_LIMIT,
} from "./registerWebPushSubscription";

const desired = {
  enabled: true,
  origin: "https://example.test",
  token: "opaque-token",
  userAgent: "browser",
};

test("unchanged web push subscriptions produce no current-document write", () => {
  assert.equal(shouldWriteCurrentWebPushSubscription({ ...desired }, desired), false);
});

test("new, changed, or previously disabled subscriptions still write", () => {
  assert.equal(shouldWriteCurrentWebPushSubscription(undefined, desired), true);
  assert.equal(
    shouldWriteCurrentWebPushSubscription({ ...desired, enabled: false }, desired),
    true,
  );
  assert.equal(
    shouldWriteCurrentWebPushSubscription({ ...desired, disabledReason: "stale" }, desired),
    true,
  );
});

test("older sibling reconciliation remains bounded", () => {
  assert.equal(WEB_PUSH_SIBLING_LIMIT, 25);
});
