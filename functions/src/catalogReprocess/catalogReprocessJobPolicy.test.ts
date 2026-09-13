import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { canClaimCatalogReprocessJob } from "./catalogReprocessJobPolicy";

describe("canClaimCatalogReprocessJob", () => {
  it("allows pending jobs", () => {
    assert.equal(
      canClaimCatalogReprocessJob({
        status: "pending",
        attemptCount: 0,
        nowMs: 1000,
      }),
      true,
    );
  });

  it("blocks when pauseRequested", () => {
    assert.equal(
      canClaimCatalogReprocessJob({
        status: "pending",
        attemptCount: 0,
        pauseRequested: true,
        nowMs: 1000,
      }),
      false,
    );
  });

  it("recovers stale running leases", () => {
    assert.equal(
      canClaimCatalogReprocessJob({
        status: "running",
        attemptCount: 1,
        leaseExpiresAtMs: 500,
        nowMs: 1000,
      }),
      true,
    );
  });

  it("respects active lease", () => {
    assert.equal(
      canClaimCatalogReprocessJob({
        status: "running",
        attemptCount: 1,
        leaseExpiresAtMs: 2000,
        nowMs: 1000,
      }),
      false,
    );
  });
});
