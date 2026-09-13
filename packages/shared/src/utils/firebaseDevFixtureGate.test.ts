import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEV_FIXTURE_ALLOWED_PROJECT_IDS,
  isDevFixtureAllowedProjectId,
  isDevFixtureShowOperationAllowed,
} from "./firebaseDevFixtureGate";

describe("firebaseDevFixtureGate", () => {
  it("allows only fresh-prints-dev", () => {
    assert.deepEqual([...DEV_FIXTURE_ALLOWED_PROJECT_IDS], ["fresh-prints-dev"]);
    assert.equal(isDevFixtureAllowedProjectId("fresh-prints-dev"), true);
    assert.equal(isDevFixtureAllowedProjectId("fresh-prints-prod"), false);
  });

  it("requires dev build and dev project", () => {
    assert.equal(
      isDevFixtureShowOperationAllowed({
        isDevelopmentBuild: true,
        projectId: "fresh-prints-dev",
      }),
      true,
    );
    assert.equal(
      isDevFixtureShowOperationAllowed({
        isDevelopmentBuild: false,
        projectId: "fresh-prints-dev",
      }),
      false,
    );
    assert.equal(
      isDevFixtureShowOperationAllowed({
        isDevelopmentBuild: true,
        projectId: "fresh-prints-prod",
      }),
      false,
    );
  });
});
