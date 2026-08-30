import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HttpsError } from "firebase-functions/v2/https";

import {
  assertCallerCanEditSmartProfile,
} from "./designSmartProfileStaffUpdate";
import type { TeamUserProfile } from "../lib/types";

function caller(overrides: Partial<TeamUserProfile> = {}): TeamUserProfile {
  return {
    id: "user-1",
    email: "user@example.com",
    displayName: "User",
    role: "helper",
    isActive: true,
    ...overrides,
  };
}

describe("assertCallerCanEditSmartProfile", () => {
  it("allows owner and admin", () => {
    assert.doesNotThrow(() => assertCallerCanEditSmartProfile(caller({ role: "owner" })));
    assert.doesNotThrow(() => assertCallerCanEditSmartProfile(caller({ role: "admin" })));
  });

  it("denies helper", () => {
    assert.throws(() => assertCallerCanEditSmartProfile(caller({ role: "helper" })), (error) => {
      assert.ok(error instanceof HttpsError);
      assert.equal(error.code, "permission-denied");
      return true;
    });
  });

  it("denies inactive user", () => {
    assert.throws(
      () => assertCallerCanEditSmartProfile(caller({ role: "owner", isActive: false })),
      (error) => {
        assert.ok(error instanceof HttpsError);
        assert.equal(error.code, "permission-denied");
        return true;
      },
    );
  });
});