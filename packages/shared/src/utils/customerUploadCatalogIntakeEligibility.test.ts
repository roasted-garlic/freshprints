import assert from "node:assert/strict";
import test from "node:test";

import { isCustomerUploadEligibleForCatalogIntake } from "./customerUploadCatalogIntakeEligibility";

test("isCustomerUploadEligibleForCatalogIntake treats explicit denial as ineligible", () => {
  assert.equal(isCustomerUploadEligibleForCatalogIntake({ catalogUseAcknowledged: false }), false);
});

test("isCustomerUploadEligibleForCatalogIntake allows true and legacy missing consent", () => {
  assert.equal(isCustomerUploadEligibleForCatalogIntake({ catalogUseAcknowledged: true }), true);
  assert.equal(isCustomerUploadEligibleForCatalogIntake({}), true);
  assert.equal(isCustomerUploadEligibleForCatalogIntake({ catalogUseAcknowledged: null }), true);
});
