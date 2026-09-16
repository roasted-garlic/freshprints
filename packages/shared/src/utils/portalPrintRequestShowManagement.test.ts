import test from "node:test";
import assert from "node:assert/strict";

import { isPortalShowManagementEligiblePrintRequest } from "./portalPrintRequestShowManagement";

test("show management accepts ordinary portal and studio customer requests", () => {
  assert.equal(
    isPortalShowManagementEligiblePrintRequest({
      requestOrigin: "portal_customer",
      isInternal: false,
    }),
    true,
  );
  assert.equal(
    isPortalShowManagementEligiblePrintRequest({
      requestOrigin: "studio_customer",
      isInternal: false,
    }),
    true,
  );
});

test("show management never accepts internal or unsupported-origin requests", () => {
  assert.equal(
    isPortalShowManagementEligiblePrintRequest({
      requestOrigin: "studio_customer",
      isInternal: true,
    }),
    false,
  );
  assert.equal(
    isPortalShowManagementEligiblePrintRequest({
      requestOrigin: "studio_internal",
      isInternal: false,
    }),
    false,
  );
  assert.equal(
    isPortalShowManagementEligiblePrintRequest({
      requestOrigin: undefined,
      isInternal: false,
    }),
    false,
  );
});
