import assert from "node:assert/strict";
import { test } from "node:test";

import { canRemoveRequestFromShow } from "./showQueueEditability";

test("canRemoveRequestFromShow: allows removal for open/full/canceled shows", () => {
  assert.equal(canRemoveRequestFromShow("open"), true);
  assert.equal(canRemoveRequestFromShow("full"), true);
  assert.equal(canRemoveRequestFromShow("canceled"), true);
});

test("canRemoveRequestFromShow: blocks removal once printing has started or finished", () => {
  assert.equal(canRemoveRequestFromShow("printing"), false);
  assert.equal(canRemoveRequestFromShow("fully_printed"), false);
  assert.equal(canRemoveRequestFromShow("completed"), false);
  assert.equal(canRemoveRequestFromShow("archived"), false);
});
