import assert from "node:assert/strict";
import test from "node:test";

import {
  isMissingCustomerUploadPurpose,
  resolveCustomerUploadPurpose,
} from "./customerUploadPurpose.ts";

test("resolveCustomerUploadPurpose treats missing purpose as print_request", () => {
  assert.equal(resolveCustomerUploadPurpose(undefined), "print_request");
  assert.equal(resolveCustomerUploadPurpose(null), "print_request");
  assert.equal(resolveCustomerUploadPurpose(""), "print_request");
  assert.equal(resolveCustomerUploadPurpose("print_request"), "print_request");
  assert.equal(resolveCustomerUploadPurpose("catalog_donation"), "catalog_donation");
});

test("isMissingCustomerUploadPurpose is true only for blank purpose", () => {
  assert.equal(isMissingCustomerUploadPurpose(undefined), true);
  assert.equal(isMissingCustomerUploadPurpose("print_request"), false);
});
