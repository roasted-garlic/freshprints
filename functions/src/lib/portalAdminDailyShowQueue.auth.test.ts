import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { assertPortalAdminQueueCaller } from "./portalAdminDailyShowQueue";
import type { TeamUserProfile } from "./types";

describe("Portal admin Show Queue authorization", () => {
  for (const role of ["owner", "admin"] as const) {
    it(`allows active ${role}`, () => {
      assert.doesNotThrow(() => assertPortalAdminQueueCaller({ id: "u", email: "", displayName: "", role, isActive: true }));
    });
  }

  for (const role of ["helper", "customer"] as const) {
    it(`denies ${role}`, () => {
      assert.throws(() => assertPortalAdminQueueCaller({ id: "u", email: "", displayName: "", role: role as TeamUserProfile["role"], isActive: true }));
    });
  }

  it("denies inactive owners and admins", () => {
    assert.throws(() => assertPortalAdminQueueCaller({ id: "u", email: "", displayName: "", role: "owner", isActive: false }));
    assert.throws(() => assertPortalAdminQueueCaller({ id: "u", email: "", displayName: "", role: "admin", isActive: false }));
  });
});
