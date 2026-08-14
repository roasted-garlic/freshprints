import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assertCanManageCustomerUploadIntake,
  assertCanDeleteCustomerUpload,
  assertCanPromoteOrRetryCustomerUpload,
  parseUploadId,
} from "./customerUploadStaffAuth";
import type { TeamUserProfile } from "./types";

function caller(overrides: Partial<TeamUserProfile> = {}): TeamUserProfile {
  return {
    id: "u1",
    email: "a@example.com",
    displayName: "A",
    role: "helper",
    isActive: true,
    ...overrides,
  };
}

describe("customerUploadStaffAuth", () => {
  it("parseUploadId requires a non-empty uploadId", () => {
    assert.equal(parseUploadId({ uploadId: " up1 " }), "up1");
    assert.throws(() => parseUploadId({}), /upload ID/i);
    assert.throws(() => parseUploadId(null), /required/i);
  });

  it("assertCanManageCustomerUploadIntake allows active staff", () => {
    assert.doesNotThrow(() => assertCanManageCustomerUploadIntake(caller({ role: "helper" })));
    assert.doesNotThrow(() => assertCanManageCustomerUploadIntake(caller({ role: "admin" })));
    assert.throws(
      () => assertCanManageCustomerUploadIntake(caller({ role: "helper", isActive: false })),
      (error: unknown) =>
        error instanceof Error && /permission|staff/i.test(String((error as { message?: string }).message)),
    );
  });

  it("assertCanPromoteOrRetryCustomerUpload allows active staff including helper", () => {
    assert.doesNotThrow(() => assertCanPromoteOrRetryCustomerUpload(caller({ role: "owner" })));
    assert.doesNotThrow(() => assertCanPromoteOrRetryCustomerUpload(caller({ role: "admin" })));
    assert.doesNotThrow(() => assertCanPromoteOrRetryCustomerUpload(caller({ role: "helper" })));
    assert.throws(
      () => assertCanPromoteOrRetryCustomerUpload(caller({ role: "helper", isActive: false })),
      (error: unknown) =>
        error instanceof Error && /permission|staff/i.test(String((error as { message?: string }).message)),
    );
    assert.throws(
      () => assertCanPromoteOrRetryCustomerUpload(caller({ role: "customer" as never })),
      /permission|staff/i,
    );
  });

  it("assertCanDeleteCustomerUpload allows owner/admin and denies helper/inactive callers", () => {
    assert.doesNotThrow(() => assertCanDeleteCustomerUpload(caller({ role: "owner" })));
    assert.doesNotThrow(() => assertCanDeleteCustomerUpload(caller({ role: "admin" })));
    assert.throws(() => assertCanDeleteCustomerUpload(caller({ role: "helper" })), /permission/i);
    assert.throws(
      () => assertCanDeleteCustomerUpload(caller({ role: "customer" as never })),
      /permission/i,
    );
    assert.throws(
      () => assertCanDeleteCustomerUpload(caller({ role: "admin", isActive: false })),
      /permission/i,
    );
  });
});
