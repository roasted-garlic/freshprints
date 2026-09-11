import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PORTAL_MAINTENANCE_DEFAULT_HEADING,
  PORTAL_MAINTENANCE_DEFAULT_MESSAGE,
  PORTAL_MAINTENANCE_MAX_HEADING_LENGTH,
  PORTAL_MAINTENANCE_MAX_MESSAGE_LENGTH,
  PORTAL_MAINTENANCE_MAX_TEST_CUSTOMER_UID_LENGTH,
  parsePortalMaintenanceSettingsInput,
  resolvePortalMaintenanceSettings,
  toPortalMaintenancePublicState,
} from "./portalMaintenance.constants";

describe("portalMaintenance constants", () => {
  it("defaults missing or malformed state to OFF for clients", () => {
    assert.deepEqual(resolvePortalMaintenanceSettings(undefined), {
      enabled: false,
      heading: PORTAL_MAINTENANCE_DEFAULT_HEADING,
      message: PORTAL_MAINTENANCE_DEFAULT_MESSAGE,
    });
    assert.deepEqual(resolvePortalMaintenanceSettings({ enabled: "yes" }), {
      enabled: false,
      heading: PORTAL_MAINTENANCE_DEFAULT_HEADING,
      message: PORTAL_MAINTENANCE_DEFAULT_MESSAGE,
    });
  });

  it("parses canonical toggle input and bounds customer copy", () => {
    assert.deepEqual(parsePortalMaintenanceSettingsInput({ enabled: true }), { enabled: true });
    assert.deepEqual(
      parsePortalMaintenanceSettingsInput({ enabled: true, message: "  Back soon.  " }),
      { enabled: true, message: "Back soon." },
    );
    assert.deepEqual(
      parsePortalMaintenanceSettingsInput({
        enabled: true,
        heading: "  Back soon!  ",
        message: "  We are returning shortly.  ",
      }),
      { enabled: true, heading: "Back soon!", message: "We are returning shortly." },
    );
    assert.deepEqual(
      parsePortalMaintenanceSettingsInput({
        enabled: true,
        maintenanceTestCustomerUid: "  tester-uid  ",
      }),
      { enabled: true, maintenanceTestCustomerUid: "tester-uid" },
    );
    assert.deepEqual(
      parsePortalMaintenanceSettingsInput({ enabled: true, maintenanceTestCustomerUid: null }),
      { enabled: true, maintenanceTestCustomerUid: null },
    );
    assert.equal(
      parsePortalMaintenanceSettingsInput({
        enabled: true,
        heading: "x".repeat(PORTAL_MAINTENANCE_MAX_HEADING_LENGTH + 1),
      }),
      null,
    );
    assert.equal(
      parsePortalMaintenanceSettingsInput({
        enabled: true,
        message: "x".repeat(PORTAL_MAINTENANCE_MAX_MESSAGE_LENGTH + 1),
      }),
      null,
    );
    assert.equal(parsePortalMaintenanceSettingsInput({ enabled: "true" }), null);
    assert.equal(
      parsePortalMaintenanceSettingsInput({
        enabled: true,
        maintenanceTestCustomerUid: "x".repeat(PORTAL_MAINTENANCE_MAX_TEST_CUSTOMER_UID_LENGTH + 1),
      }),
      null,
    );
  });

  it("exposes only enabled and safe message fields publicly", () => {
    assert.deepEqual(
      toPortalMaintenancePublicState({
        enabled: true,
        heading: "Planned improvements",
        message: "Service pause",
        maintenanceTestCustomerUid: "private-uid",
        updatedAt: "secret timestamp",
        updatedBy: "owner-id",
      }),
      {
        enabled: true,
        heading: "Planned improvements",
        message: "Service pause",
        maintenanceTestAccessGranted: false,
      },
    );
    assert.deepEqual(
      toPortalMaintenancePublicState(
        { enabled: true, maintenanceTestCustomerUid: "private-uid" },
        true,
      ),
      {
        enabled: true,
        heading: PORTAL_MAINTENANCE_DEFAULT_HEADING,
        message: PORTAL_MAINTENANCE_DEFAULT_MESSAGE,
        maintenanceTestAccessGranted: true,
      },
    );
  });
});
