import assert from "node:assert/strict";
import test from "node:test";

import { getStudioEnvironmentIdentity } from "./environmentIdentity";

test("uses isolated development identity for fresh-prints-dev", () => {
  assert.deepEqual(getStudioEnvironmentIdentity("fresh-prints-dev"), {
    environment: "development",
    userDataDirectoryName: "Fresh Prints Studio Dev",
    windowsAppUserModelId: "com.freshprints.studio.dev",
    isDevelopment: true,
  });
});

test("uses production identity for production and unknown projects", () => {
  assert.equal(getStudioEnvironmentIdentity("fresh-prints-prod").isDevelopment, false);
  assert.equal(getStudioEnvironmentIdentity(undefined).windowsAppUserModelId, "com.freshprints.studio");
});

