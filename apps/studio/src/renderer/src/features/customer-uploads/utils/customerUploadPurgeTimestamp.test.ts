import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { mapCustomerUploadPurgeTimestamp } from "./customerUploadPurgeTimestamp";

describe("customer-upload purge timestamp", () => {
  it("retains settled purge timestamps and defaults absent values to null", () => {
    assert.equal(mapCustomerUploadPurgeTimestamp({ toMillis: () => 42 }), 42);
    assert.equal(mapCustomerUploadPurgeTimestamp(undefined), null);
  });
});
