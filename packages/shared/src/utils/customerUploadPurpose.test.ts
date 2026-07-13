import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parseCustomerUploadPurpose,
  resolveCustomerUploadPurpose,
} from "./customerUploadPurpose";

describe("customerUploadPurpose", () => {
  it("resolves missing purpose as print_request", () => {
    assert.equal(resolveCustomerUploadPurpose(undefined), "print_request");
    assert.equal(resolveCustomerUploadPurpose(null), "print_request");
    assert.equal(resolveCustomerUploadPurpose("print_request"), "print_request");
  });

  it("resolves catalog_donation", () => {
    assert.equal(resolveCustomerUploadPurpose("catalog_donation"), "catalog_donation");
  });

  it("parses valid purpose and defaults empty", () => {
    assert.equal(parseCustomerUploadPurpose(undefined), "print_request");
    assert.equal(parseCustomerUploadPurpose("catalog_donation"), "catalog_donation");
  });

  it("rejects invalid purpose on parse", () => {
    assert.throws(() => parseCustomerUploadPurpose("other"), /purpose must be/);
  });
});
