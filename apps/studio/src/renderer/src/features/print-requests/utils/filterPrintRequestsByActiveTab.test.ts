import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { PrintRequest } from "@fresh-prints/shared/types/printRequest/printRequest.types";

import { filterPrintRequestsByActiveTab } from "./filterPrintRequestsByActiveTab";

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

describe("filterPrintRequestsByActiveTab", () => {
  it("keeps a request whose queueTab matches the active tab", () => {
    const result = filterPrintRequestsByActiveTab([buildRequest("a", "working")], "working");

    assert.deepEqual(result.map((request) => request.id), ["a"]);
  });

  it("rejects a request whose queueTab disagrees with the active tab (render-time safety net for the transitional stale-list window)", () => {
    // Reproduces exactly what a transitional render would contain: `requests` still holding the
    // previous tab's page under the newly active tab.
    const result = filterPrintRequestsByActiveTab([buildRequest("queued-request", "queued")], "working");

    assert.deepEqual(result, []);
  });

  it("keeps a request with no queueTab (pre-backfill legacy document) regardless of active tab", () => {
    const result = filterPrintRequestsByActiveTab([buildRequest("legacy", undefined)], "working");

    assert.deepEqual(result.map((request) => request.id), ["legacy"]);
  });

  it("rejects mismatched requests for all four queueTab values against every other active tab", () => {
    const tabs: NonNullable<PrintRequest["queueTab"]>[] = ["working", "queued", "printing", "printed"];

    for (const requestTab of tabs) {
      for (const activeTab of tabs) {
        const result = filterPrintRequestsByActiveTab([buildRequest("r", requestTab)], activeTab);
        const expected = requestTab === activeTab ? ["r"] : [];
        assert.deepEqual(
          result.map((request) => request.id),
          expected,
          `queueTab=${requestTab} vs activeTab=${activeTab}`,
        );
      }
    }
  });

  it("filters a mixed list, keeping only requests matching the active tab or with no queueTab", () => {
    const requests = [
      buildRequest("working-1", "working"),
      buildRequest("queued-1", "queued"),
      buildRequest("legacy-1", undefined),
      buildRequest("printing-1", "printing"),
    ];

    const result = filterPrintRequestsByActiveTab(requests, "working");

    assert.deepEqual(result.map((request) => request.id), ["working-1", "legacy-1"]);
  });
});
