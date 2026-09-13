import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assertDevFixtureProjectAllowed,
  DEV_FIXTURE_ALLOWED_PROJECT_ID,
  resolveTrustedProjectId,
} from "./devFixtureProjectGate";
import { failedPrecondition } from "./errors";

describe("devFixtureProjectGate", () => {
  it("allows fresh-prints-dev only", () => {
    const previous = process.env.GCLOUD_PROJECT;
    process.env.GCLOUD_PROJECT = DEV_FIXTURE_ALLOWED_PROJECT_ID;
    try {
      assert.doesNotThrow(() => assertDevFixtureProjectAllowed());
      assert.equal(resolveTrustedProjectId(), DEV_FIXTURE_ALLOWED_PROJECT_ID);
    } finally {
      if (previous === undefined) {
        delete process.env.GCLOUD_PROJECT;
      } else {
        process.env.GCLOUD_PROJECT = previous;
      }
    }
  });

  it("rejects production project", () => {
    const previous = process.env.GCLOUD_PROJECT;
    process.env.GCLOUD_PROJECT = "fresh-prints-prod";
    try {
      assert.throws(() => assertDevFixtureProjectAllowed(), (error: unknown) => {
        return error instanceof Error && error.message.includes("fresh-prints-dev");
      });
    } finally {
      if (previous === undefined) {
        delete process.env.GCLOUD_PROJECT;
      } else {
        process.env.GCLOUD_PROJECT = previous;
      }
    }
  });

  it("maps to failed-precondition HttpsError shape", () => {
    assert.throws(
      () => {
        throw failedPrecondition("DEV fixture shows are only available on fresh-prints-dev.");
      },
      (error: unknown) => error instanceof Error && error.message.includes("fresh-prints-dev"),
    );
  });
});
