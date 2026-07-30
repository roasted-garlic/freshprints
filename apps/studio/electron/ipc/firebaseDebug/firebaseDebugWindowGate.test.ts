import assert from "node:assert/strict";
import test from "node:test";

import { canOpenFirebaseDebugWindow } from "./firebaseDebugWindowGate";

test("allows only unpackaged dev project requests from the main window", () => {
  assert.equal(
    canOpenFirebaseDebugWindow({
      isPackaged: false,
      projectId: "fresh-prints-dev",
      isMainWindowSender: true,
    }),
    true,
  );
});

test("denies packaged production builds", () => {
  assert.equal(
    canOpenFirebaseDebugWindow({
      isPackaged: true,
      projectId: "fresh-prints-dev",
      isMainWindowSender: true,
    }),
    false,
  );
});

test("denies non-dev Firebase projects", () => {
  assert.equal(
    canOpenFirebaseDebugWindow({
      isPackaged: false,
      projectId: "fresh-prints-prod",
      isMainWindowSender: true,
    }),
    false,
  );
});

test("denies requests not sent by the retained main window", () => {
  assert.equal(
    canOpenFirebaseDebugWindow({
      isPackaged: false,
      projectId: "fresh-prints-dev",
      isMainWindowSender: false,
    }),
    false,
  );
});
