import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  classifyCommittedShowTimerPhase,
  type ShowTimerActionName,
} from "./showTimerActionPhase";

describe("show timer service/hook committed phase matrix", () => {
  for (const actionName of ["start", "pause", "resume", "finish"] satisfies ShowTimerActionName[]) {
    it(`${actionName}: distinguishes committed success from post-commit refresh failure`, () => {
      assert.equal(classifyCommittedShowTimerPhase({}, false), "committed");
      assert.equal(classifyCommittedShowTimerPhase({}, true), "committed_refresh_failed");
    });
  }

  it("finish: reports partial reconciliation without relabeling the mutation as failed", () => {
    assert.equal(classifyCommittedShowTimerPhase({
      reconciliation: {
        affectedRequestCount: 2,
        failedRequestCount: 1,
        failedRequestIds: ["request-2"],
        remediationRequestCount: 0,
        remediationRequestIds: [],
        results: [],
      },
    }, false), "committed_reconciliation_partial");
  });
});
