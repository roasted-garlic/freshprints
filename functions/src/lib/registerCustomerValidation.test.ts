import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PORTAL_BIDDING_ACKNOWLEDGMENT_VERSION } from "../../../packages/shared/src/constants/portal/portalBiddingAcknowledgment.constants";
import { validateRegisterCustomerRequest } from "./registerCustomerValidation";

const validAck = {
  biddingAcknowledgmentAccepted: true as const,
  biddingAcknowledgmentVersion: PORTAL_BIDDING_ACKNOWLEDGMENT_VERSION,
};

describe("validateRegisterCustomerRequest", () => {
  it("accepts a valid registration payload with acknowledgment", () => {
    const result = validateRegisterCustomerRequest(
      { displayName: "Alex Customer", username: "alex_prints", ...validAck },
      "Alex@Example.com",
    );

    assert.deepEqual(result, {
      displayName: "Alex Customer",
      username: "alex_prints",
      email: "alex@example.com",
      ...validAck,
    });
  });

  it("rejects reserved usernames", () => {
    assert.throws(
      () =>
        validateRegisterCustomerRequest(
          { displayName: "Alex Customer", username: "admin", ...validAck },
          "alex@example.com",
        ),
      /reserved/i,
    );
  });

  it("rejects missing auth email", () => {
    assert.throws(
      () =>
        validateRegisterCustomerRequest(
          { displayName: "Alex Customer", username: "alex_prints", ...validAck },
          undefined,
        ),
      /verified email/i,
    );
  });

  it("rejects missing bidding acknowledgment", () => {
    assert.throws(
      () =>
        validateRegisterCustomerRequest(
          { displayName: "Alex Customer", username: "alex_prints" },
          "alex@example.com",
        ),
      /public bidding/i,
    );
  });
});
