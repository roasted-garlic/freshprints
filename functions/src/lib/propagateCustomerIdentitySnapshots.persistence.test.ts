import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Timestamp } from "firebase-admin/firestore";

import { buildPersistedPropagationState } from "./propagateCustomerIdentitySnapshots";

describe("identity snapshot propagation persistence", () => {
  const baseState = {
    status: "completed" as const,
    targetUsername: "newuser",
    targetDisplayName: "New User",
    printRequestCursor: null,
    designIssueReportCursor: null,
    stage: "designIssueReports" as const,
    printRequestsUpdated: 2,
    designIssueReportsUpdated: 1,
    startedAt: Timestamp.fromMillis(1_700_000_000_000),
    updatedAt: Timestamp.fromMillis(1_700_000_000_000),
  };

  it("omits lastError when propagation completes without failure", () => {
    const persisted = buildPersistedPropagationState({ ...baseState });

    assert.equal("lastError" in persisted, false);
    assert.equal(persisted.status, "completed");
    assert.ok(persisted.updatedAt instanceof Timestamp);
  });

  it("persists lastError only when a failure message exists", () => {
    const persisted = buildPersistedPropagationState({
      ...baseState,
      status: "failed",
      lastError: "Propagation batch failed.",
    });

    assert.equal(persisted.lastError, "Propagation batch failed.");
  });

  it("never serializes undefined nested values", () => {
    const persisted = buildPersistedPropagationState({
      ...baseState,
      printRequestCursor: undefined,
      designIssueReportCursor: undefined,
      lastError: undefined,
    });

    assert.equal(JSON.stringify(persisted).includes("undefined"), false);
    assert.equal("lastError" in persisted, false);
    assert.equal("printRequestCursor" in persisted, false);
  });
});
