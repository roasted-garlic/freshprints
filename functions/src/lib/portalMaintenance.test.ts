import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isPortalMaintenanceTestAccessGranted } from "./portalMaintenance";

describe("portal maintenance tester decision", () => {
  it("allows only the configured caller while enabled", () => {
    const state = { enabled: true, maintenanceTestCustomerUid: "tester" };

    assert.equal(isPortalMaintenanceTestAccessGranted(state, "tester"), true);
    assert.equal(isPortalMaintenanceTestAccessGranted(state, "other"), false);
    assert.equal(isPortalMaintenanceTestAccessGranted(state, undefined), false);
  });

  it("does not grant access while maintenance is off or unconfigured", () => {
    assert.equal(
      isPortalMaintenanceTestAccessGranted(
        { enabled: false, maintenanceTestCustomerUid: "tester" },
        "tester",
      ),
      false,
    );
    assert.equal(isPortalMaintenanceTestAccessGranted({ enabled: true }, "tester"), false);
    assert.equal(
      isPortalMaintenanceTestAccessGranted(
        { enabled: true, maintenanceTestCustomerUid: null },
        "tester",
      ),
      false,
    );
  });
});
