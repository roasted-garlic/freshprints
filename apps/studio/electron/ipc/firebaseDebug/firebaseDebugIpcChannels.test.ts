import assert from "node:assert/strict";
import test from "node:test";

import {
  FIREBASE_DEBUG_IPC_CHANNELS,
  isAllowedFirebaseDebugIpcChannel,
} from "./firebaseDebugIpcChannels";

test("all declared Firebase Debug channels are allowlisted", () => {
  for (const channel of Object.values(FIREBASE_DEBUG_IPC_CHANNELS)) {
    assert.equal(isAllowedFirebaseDebugIpcChannel(channel), true);
  }
});

test("arbitrary channels are denied", () => {
  assert.equal(isAllowedFirebaseDebugIpcChannel("firebase-debug:raw-payload"), false);
});
