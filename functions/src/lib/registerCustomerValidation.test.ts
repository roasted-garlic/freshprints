import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validateRegisterCustomerRequest } from "./registerCustomerValidation";

describe("validateRegisterCustomerRequest", () => {
  it("accepts a valid registration payload", () => {
    const result = validateRegisterCustomerRequest(
      { displayName: "Alex Customer", username: "alex_prints" },
      "Alex@Example.com",
    );

    assert.deepEqual(result, {
      displayName: "Alex Customer",
      username: "alex_prints",
      email: "alex@example.com",
    });
  });

  it("rejects reserved usernames", () => {
    assert.throws(
      () =>
        validateRegisterCustomerRequest(
          { displayName: "Alex Customer", username: "admin" },
          "alex@example.com",
        ),
      /reserved/i,
    );
  });

  it("rejects missing auth email", () => {
    assert.throws(
      () => validateRegisterCustomerRequest({ displayName: "Alex Customer", username: "alex_prints" }, undefined),
      /verified email/i,
    );
  });
});
