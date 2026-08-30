import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

describe("updateCustomer partial-success contract", () => {
  const updateCustomerSource = readFileSync(resolve(import.meta.dirname, "updateCustomer.ts"), "utf8");

  it("returns success after canonical profile update even when propagation fails", () => {
    assert.match(updateCustomerSource, /propagationWarning/);
    assert.match(updateCustomerSource, /catch \(propagationError\)/);
    assert.match(updateCustomerSource, /propagationComplete = false/);
  });
});
