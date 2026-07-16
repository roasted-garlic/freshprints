import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validateUpdateCustomerRequest } from "./customerUpdateValidation";

describe("validateUpdateCustomerRequest", () => {
  it("accepts a valid update payload", () => {
    const result = validateUpdateCustomerRequest({
      customerId: "customer-1",
      displayName: "Ion Supply",
      username: "ionsupply",
      email: "ionsupplyllc@gmail.com",
      notes: "VIP",
    });

    assert.deepEqual(result, {
      customerId: "customer-1",
      displayName: "Ion Supply",
      username: "ionsupply",
      email: "ionsupplyllc@gmail.com",
      notes: "VIP",
    });
  });

  it("requires customerId", () => {
    assert.throws(
      () =>
        validateUpdateCustomerRequest({
          displayName: "Ion Supply",
          username: "ionsupply",
        }),
      /customer ID/i,
    );
  });

  it("requires email format when email is provided", () => {
    assert.throws(
      () =>
        validateUpdateCustomerRequest({
          customerId: "customer-1",
          displayName: "Ion Supply",
          username: "ionsupply",
          email: "not-an-email",
        }),
      /valid email/i,
    );
  });
});
