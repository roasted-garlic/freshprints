import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { PrintRequest } from "@fresh-prints/shared/types/printRequest/printRequest.types";

import type { PrintRequestItemSummary } from "../services/printRequestService";
import {
  reconcileDeletedOrArchivedRequest,
  type PrintRequestListState,
} from "./reconcileDeletedOrArchivedRequest";

function buildRequest(id: string, status: PrintRequest["status"] = "draft"): PrintRequest {
  return {
    id,
    name: `Request ${id}`,
    customerId: "customer-1",
    isInternal: false,
    requestOrigin: "studio_internal",
    status,
    itemCount: 0,
    createdBy: "user-1",
    updatedBy: "user-1",
    createdAt: undefined as unknown as PrintRequest["createdAt"],
    updatedAt: undefined as unknown as PrintRequest["updatedAt"],
  } as PrintRequest;
}

function buildState(ids: string[], workingCount = ids.length): PrintRequestListState {
  const requests = ids.map((id) => buildRequest(id));
  const summariesByRequestId = Object.fromEntries(
    ids.map((id) => [id, { itemCount: 1 } as unknown as PrintRequestItemSummary]),
  );
  return {
    requests,
    summariesByRequestId,
    countsByTab: { working: workingCount, editing: 0, queued: 0, printing: 0, printed: 0 },
  };
}

describe("reconcileDeletedOrArchivedRequest", () => {
  it("removes the deleted request and its item summary, leaving others untouched", () => {
    const state = buildState(["a", "b", "c"]);

    const result = reconcileDeletedOrArchivedRequest(state, "b", "deleted", "working");

    assert.deepEqual(
      result.requests.map((request) => request.id),
      ["a", "c"],
    );
    assert.deepEqual(Object.keys(result.summariesByRequestId), ["a", "c"]);
  });

  it("patches an archived request's status locally without touching other requests", () => {
    const state = buildState(["a", "b"]);

    const result = reconcileDeletedOrArchivedRequest(state, "a", "archived", "working");

    assert.equal(result.requests.find((request) => request.id === "a")?.status, "archived");
    assert.equal(result.requests.find((request) => request.id === "b")?.status, "draft");
    assert.equal(result.requests.length, 2);
  });

  it("preserves item summaries when archiving (only deletion drops the summary)", () => {
    const state = buildState(["a"]);

    const result = reconcileDeletedOrArchivedRequest(state, "a", "archived", "working");

    assert.deepEqual(Object.keys(result.summariesByRequestId), ["a"]);
  });

  it("is a no-op on requests/summaries/counts when the target id is not present", () => {
    const state = buildState(["a", "b"]);

    const result = reconcileDeletedOrArchivedRequest(state, "missing", "deleted", "working");

    assert.deepEqual(
      result.requests.map((request) => request.id),
      ["a", "b"],
    );
    assert.deepEqual(Object.keys(result.summariesByRequestId), ["a", "b"]);
    assert.equal(result.countsByTab.working, 2);
  });

  it("decrements the exact tab count by 1 on delete", () => {
    const state = buildState(["a", "b", "c"], 3);

    const result = reconcileDeletedOrArchivedRequest(state, "b", "deleted", "working");

    assert.equal(result.countsByTab.working, 2);
  });

  it("decrements the exact tab count by 1 on archive", () => {
    const state = buildState(["a", "b"], 2);

    const result = reconcileDeletedOrArchivedRequest(state, "a", "archived", "working");

    assert.equal(result.countsByTab.working, 1);
  });

  it("decrements the count for whichever tab is passed as active, not always working", () => {
    const state: PrintRequestListState = {
      requests: [buildRequest("a", "active")],
      summariesByRequestId: {},
      countsByTab: { working: 0, editing: 0, queued: 5, printing: 0, printed: 0 },
    };

    const result = reconcileDeletedOrArchivedRequest(state, "a", "deleted", "queued");

    assert.equal(result.countsByTab.queued, 4);
    assert.equal(result.countsByTab.working, 0);
  });

  it("never decrements a count below zero", () => {
    const state = buildState(["a"], 0);

    const result = reconcileDeletedOrArchivedRequest(state, "a", "deleted", "working");

    assert.equal(result.countsByTab.working, 0);
  });
});
