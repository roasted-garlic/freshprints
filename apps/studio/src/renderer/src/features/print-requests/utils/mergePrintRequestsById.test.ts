import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { PrintRequest } from "@fresh-prints/shared/types/printRequest/printRequest.types";

import { mergePrintRequestsById } from "./mergePrintRequestsById";

function buildRequest(id: string, queueTab: PrintRequest["queueTab"]): PrintRequest {
  return {
    id,
    name: `Request ${id}`,
    customerId: "customer-1",
    isInternal: false,
    requestOrigin: "studio_internal",
    status: "active",
    itemCount: 1,
    queueTab,
    createdBy: "user-1",
    updatedBy: "user-1",
    createdAt: undefined as unknown as PrintRequest["createdAt"],
    updatedAt: undefined as unknown as PrintRequest["updatedAt"],
  } as PrintRequest;
}

describe("mergePrintRequestsById", () => {
  it("admits an addition whose queueTab matches the active tab", () => {
    const result = mergePrintRequestsById([], [buildRequest("a", "working")], "working");

    assert.deepEqual(result.map((request) => request.id), ["a"]);
  });

  it("rejects an addition whose queueTab disagrees with the active tab (Working-tab contamination regression)", () => {
    // Regression for the exact reported defect: a request already correctly loaded on the Queued
    // tab was subsequently merged into the Working tab's state via `ensureRequestsLoaded`, with no
    // check against the tab this hook instance actually represents.
    const result = mergePrintRequestsById([], [buildRequest("queued-request", "queued")], "working");

    assert.deepEqual(result, []);
  });

  it("admits an addition when queueTab is absent (pre-backfill legacy document)", () => {
    const result = mergePrintRequestsById([], [buildRequest("legacy", undefined)], "working");

    assert.deepEqual(result.map((request) => request.id), ["legacy"]);
  });

  it("rejects mismatched requests for all four queueTab values against every other active tab", () => {
    const tabs: NonNullable<PrintRequest["queueTab"]>[] = ["working", "queued", "printing", "printed"];

    for (const requestTab of tabs) {
      for (const activeTab of tabs) {
        const result = mergePrintRequestsById([], [buildRequest("r", requestTab)], activeTab);
        const expected = requestTab === activeTab ? ["r"] : [];
        assert.deepEqual(
          result.map((request) => request.id),
          expected,
          `queueTab=${requestTab} vs activeTab=${activeTab}`,
        );
      }
    }
  });

  it("preserves already-present entries not touched by the addition", () => {
    const existing = buildRequest("existing", "working");
    const result = mergePrintRequestsById(
      [existing],
      [buildRequest("mismatched", "queued")],
      "working",
    );

    assert.deepEqual(result.map((request) => request.id), ["existing"]);
  });

  it("overwrites an existing entry by id when the addition matches the active tab (fresher data wins)", () => {
    const stale = buildRequest("a", "working");
    const fresh = { ...buildRequest("a", "working"), name: "Fresh Request a" };

    const result = mergePrintRequestsById([stale], [fresh], "working");

    assert.equal(result.length, 1);
    assert.equal(result[0].name, "Fresh Request a");
  });

  it("does not admit an already-present entry's replacement when the addition's queueTab no longer matches (moved to another tab)", () => {
    // A request that was Working when first loaded, then moved to Queued (e.g. added to a show)
    // between renders — a subsequent stale fetch for the Working tab must not resurrect/refresh it
    // there once its authoritative queueTab has changed.
    const existing = buildRequest("a", "working");
    const movedElsewhere = buildRequest("a", "queued");

    const result = mergePrintRequestsById([existing], [movedElsewhere], "working");

    assert.deepEqual(result, [existing]);
  });
});
