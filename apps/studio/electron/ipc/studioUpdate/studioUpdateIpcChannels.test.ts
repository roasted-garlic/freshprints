import assert from "node:assert/strict";
import test from "node:test";

import {
  STUDIO_UPDATE_IPC_CHANNELS,
  isAllowedStudioUpdateIpcChannel,
} from "./studioUpdateIpcChannels";

test("all declared Studio update channels are allowlisted", () => {
  for (const channel of Object.values(STUDIO_UPDATE_IPC_CHANNELS)) {
    assert.equal(isAllowedStudioUpdateIpcChannel(channel), true);
  }
});

test("arbitrary channels are denied", () => {
  assert.equal(isAllowedStudioUpdateIpcChannel("fresh-prints:studio-update:arbitrary"), false);
  assert.equal(isAllowedStudioUpdateIpcChannel("__proto__"), false);
});
