import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

describe("Studio customer identity mapper contract", () => {
  const customerServiceSource = readFileSync(
    resolve(import.meta.dirname, "../../customers/services/customerService.ts"),
    "utf8",
  );

  it("maps reversible disable fields from Firestore customer documents", () => {
    assert.match(customerServiceSource, /readCustomerIdentityDocumentFields/);
    assert.match(customerServiceSource, /disabledAt:/);
    assert.match(customerServiceSource, /\.\.\.identityRest/);
  });
});
