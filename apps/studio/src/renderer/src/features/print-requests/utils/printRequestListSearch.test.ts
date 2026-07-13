import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  filterPrintRequestsByListSearch,
  normalizePrintRequestListSearchQuery,
  printRequestMatchesListSearch,
} from "./printRequestListSearch";

describe("printRequestListSearch", () => {
  const customers = new Map([
    ["c1", { id: "c1", displayName: "Alex Rivera", username: "alexr" }],
  ]);

  const request = {
    id: "req-abc",
    name: "alexr-CR001",
    customerId: "c1",
    customerUsernameSnapshot: "alexr",
    customerDisplayNameSnapshot: "Alex Rivera",
    notes: "VIP",
  };

  it("normalizes query", () => {
    assert.equal(normalizePrintRequestListSearchQuery("  Foo  "), "foo");
  });

  it("matches name, id, username, and live customer fields", () => {
    assert.equal(printRequestMatchesListSearch(request, "cr001", customers), true);
    assert.equal(printRequestMatchesListSearch(request, "req-abc", customers), true);
    assert.equal(printRequestMatchesListSearch(request, "alexr", customers), true);
    assert.equal(printRequestMatchesListSearch(request, "rivera", customers), true);
    assert.equal(printRequestMatchesListSearch(request, "nope", customers), false);
  });

  it("filters lists", () => {
    const results = filterPrintRequestsByListSearch([request], "VIP", customers);
    assert.equal(results.length, 1);
  });
});
