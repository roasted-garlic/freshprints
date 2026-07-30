import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { invokeCustomerUploadRefresh } from "./customerUploadRefreshAction";

describe("customer-upload page refresh action", () => {
  it("invokes the current refresh callback exactly once", () => {
    let calls = 0;
    invokeCustomerUploadRefresh(async () => {
      calls += 1;
    });
    assert.equal(calls, 1);
  });
});
