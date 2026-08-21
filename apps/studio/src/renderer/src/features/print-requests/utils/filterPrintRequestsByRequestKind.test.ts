import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { PrintRequest } from "@fresh-prints/shared/types/printRequest/printRequest.types";
import type { PrintRequestListTab } from "@fresh-prints/shared/utils/printRequestListGrouping";

import { filterPrintRequestsByActiveTab } from "./filterPrintRequestsByActiveTab";
import { filterPrintRequestsByRequestKind } from "./filterPrintRequestsByRequestKind";
import { filterPrintRequestsByListSearch } from "./printRequestListSearch";

function buildRequest(
  id: string,
  isInternal: boolean,
  queueTab: PrintRequest["queueTab"] = "working",
): PrintRequest {
  return {
    id,
    name: isInternal ? `internal-${id}` : `customer-${id}`,
    customerId: isInternal ? undefined : "customer-1",
    isInternal,
    requestOrigin: isInternal ? "studio_internal" : "studio_customer",
    status: "draft",
    itemCount: 0,
    queueTab,
    createdBy: "user-1",
    updatedBy: "user-1",
    createdAt: undefined as unknown as PrintRequest["createdAt"],
    updatedAt: undefined as unknown as PrintRequest["updatedAt"],
  } as PrintRequest;
}

const mixedFixture = [
  buildRequest("c1", false),
  buildRequest("c2", false),
  buildRequest("c3", false),
  buildRequest("i1", true),
  buildRequest("i2", true),
];

describe("filterPrintRequestsByRequestKind", () => {
  it("shows exactly the 3 customer requests and no internal requests", () => {
    const result = filterPrintRequestsByRequestKind(mixedFixture, false);

    assert.deepEqual(result.map((request) => request.id), ["c1", "c2", "c3"]);
    assert.equal(result.every((request) => request.isInternal === false), true);
  });

  it("shows exactly the 2 internal requests and no customer requests", () => {
    const result = filterPrintRequestsByRequestKind(mixedFixture, true);

    assert.deepEqual(result.map((request) => request.id), ["i1", "i2"]);
    assert.equal(result.every((request) => request.isInternal === true), true);
  });

  it("switches Customer → Internal → Customer without duplicates or cross-leaks", () => {
    const customer = filterPrintRequestsByRequestKind(mixedFixture, false);
    const internal = filterPrintRequestsByRequestKind(mixedFixture, true);
    const customerAgain = filterPrintRequestsByRequestKind(mixedFixture, false);

    assert.deepEqual(customer.map((request) => request.id), ["c1", "c2", "c3"]);
    assert.deepEqual(internal.map((request) => request.id), ["i1", "i2"]);
    assert.deepEqual(customerAgain.map((request) => request.id), ["c1", "c2", "c3"]);
    assert.equal(new Set(customer.map((request) => request.id)).size, customer.length);
    assert.equal(new Set(internal.map((request) => request.id)).size, internal.length);
  });

  it("keeps queueTab filtering scoped to the selected request kind", () => {
    const requests = [
      buildRequest("c-working", false, "working"),
      buildRequest("c-queued", false, "queued"),
      buildRequest("i-working", true, "working"),
      buildRequest("i-queued", true, "queued"),
    ];
    const tabs: PrintRequestListTab[] = ["working", "queued"];

    for (const isInternal of [false, true]) {
      for (const tab of tabs) {
        const result = filterPrintRequestsByActiveTab(
          filterPrintRequestsByRequestKind(requests, isInternal),
          tab,
        );
        assert.equal(result.length, 1, `isInternal=${isInternal} tab=${tab}`);
        assert.equal(result[0].isInternal, isInternal);
        assert.equal(result[0].queueTab, tab);
      }
    }
  });

  it("does not let customer search return an internal request from a customer-scoped list", () => {
    const customers = filterPrintRequestsByRequestKind(mixedFixture, false);
    const results = filterPrintRequestsByListSearch(customers, "internal-i1", new Map());

    assert.deepEqual(results, []);
  });

  it("does not let internal search return a customer request from an internal-scoped list", () => {
    const internals = filterPrintRequestsByRequestKind(mixedFixture, true);
    const results = filterPrintRequestsByListSearch(internals, "customer-c1", new Map());

    assert.deepEqual(results, []);
  });

  it("classifies create payloads by isInternal, not by request name", () => {
    const createdCustomer = buildRequest("new-customer", false);
    createdCustomer.name = "custom-IR999";
    const createdInternal = buildRequest("new-internal", true);
    createdInternal.name = "staff-CR999";

    assert.deepEqual(
      filterPrintRequestsByRequestKind([createdCustomer, createdInternal], false).map(
        (request) => request.id,
      ),
      ["new-customer"],
    );
    assert.deepEqual(
      filterPrintRequestsByRequestKind([createdCustomer, createdInternal], true).map(
        (request) => request.id,
      ),
      ["new-internal"],
    );
  });
});
