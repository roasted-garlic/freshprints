import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyStaffInboxPageVerification,
  reconcileStaffInboxPage,
  type StaffInboxPageReconciliationState,
} from "./staffInboxPageReconciliation";

function pageState(...documentIds: string[]): StaffInboxPageReconciliationState<string> {
  return {
    records: new Map(documentIds.map((documentId) => [documentId, documentId])),
    windowDocumentIds: new Set(documentIds),
    hasMore: true,
    revision: 0,
  };
}

describe("staffInboxPageReconciliation", () => {
  it("retains the consumed boundary row when a live insert shifts it out of the page window", () => {
    const state = pageState("a", "b", "c");

    const evicted = reconcileStaffInboxPage(
      state,
      new Map([
        ["new", "new"],
        ["a", "a"],
        ["b", "b"],
      ]),
      new Set(["new", "a", "b"]),
      true,
    );

    assert.deepEqual(evicted, ["c"]);
    assert.deepEqual([...state.records.keys()], ["a", "b", "c", "new"]);
    assert.equal(state.revision, 1);
  });

  it("keeps a shifted row after source verification confirms it still matches", () => {
    const state = pageState("a", "b", "c");
    const evicted = reconcileStaffInboxPage(
      state,
      new Map([
        ["new", "new"],
        ["a", "a"],
        ["b", "b"],
      ]),
      new Set(["new", "a", "b"]),
      true,
    );

    applyStaffInboxPageVerification(state, evicted, new Map([["c", "c-updated"]]));

    assert.equal(state.records.get("c"), "c-updated");
  });

  it("removes only rows confirmed missing or outside the source filter", () => {
    const state = pageState("a", "b", "c");
    const evicted = reconcileStaffInboxPage(
      state,
      new Map([["new", "new"]]),
      new Set(["new"]),
      false,
    );

    applyStaffInboxPageVerification(state, evicted, new Map([["a", "a-still-valid"]]));

    assert.equal(state.records.get("a"), "a-still-valid");
    assert.equal(state.records.has("b"), false);
    assert.equal(state.records.has("c"), false);
    assert.equal(state.hasMore, false);
  });
});
