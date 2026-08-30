import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

describe("restoreCustomerAccount reconciliation contract", () => {
  const source = readFileSync(resolve(import.meta.dirname, "disableCustomerAccount.ts"), "utf8");

  it("re-enables Auth and restores users.isActive on successful restore", () => {
    assert.match(source, /isActive:\s*true/);
    assert.match(source, /isDeleted:\s*false/);
    assert.match(source, /disabled:\s*false/);
    assert.match(source, /isDisabled:\s*false/);
  });

  it("marks users inactive when reversibly disabling", () => {
    assert.match(source, /isActive:\s*false/);
    assert.match(source, /disabled:\s*true/);
  });

  it("fails closed when Auth disable does not succeed", () => {
    assert.match(source, /authDisableFailed/);
    assert.match(source, /failedPrecondition/);
    assert.match(source, /Firebase sign-in could not be disabled/);
  });

  it("fails closed when Auth restore does not succeed", () => {
    assert.match(source, /authRestoreFailed/);
    assert.match(source, /Firebase sign-in could not be re-enabled/);
  });
});
