import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validateCreateCustomerWithPortalInviteRequest } from "./customerPortalInviteValidation";

describe("validateCreateCustomerWithPortalInviteRequest", () => {
  it("accepts a valid invite payload", () => {
    const result = validateCreateCustomerWithPortalInviteRequest({
      displayName: "Ion Supply",
      username: "ionsupply",
      email: "Ion@Example.com",
      notes: "VIP",
    });

    assert.deepEqual(result, {
      displayName: "Ion Supply",
      username: "ionsupply",
      email: "ion@example.com",
      notes: "VIP",
    });
  });

  it("requires email", () => {
    assert.throws(
      () =>
        validateCreateCustomerWithPortalInviteRequest({
          displayName: "Ion Supply",
          username: "ionsupply",
          email: "",
        }),
      /valid email/i,
    );
  });
});
