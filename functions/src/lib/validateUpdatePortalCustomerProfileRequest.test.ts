import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validateUpdatePortalCustomerProfileRequest } from "./validateUpdatePortalCustomerProfileRequest";

describe("validateUpdatePortalCustomerProfileRequest", () => {
  it("accepts a valid profile payload", () => {
    const result = validateUpdatePortalCustomerProfileRequest({
      displayName: "Alex Supply",
      username: "alexs",
    });

    assert.deepEqual(result, {
      displayName: "Alex Supply",
      username: "alexs",
    });
  });

  it("requires display name", () => {
    assert.throws(
      () =>
        validateUpdatePortalCustomerProfileRequest({
          displayName: "A",
          username: "alexs",
        }),
      /at least 2 characters/i,
    );
  });

  it("requires valid username", () => {
    assert.throws(
      () =>
        validateUpdatePortalCustomerProfileRequest({
          displayName: "Alex Supply",
          username: "!!",
        }),
      /3-32 characters/i,
    );
  });
});
