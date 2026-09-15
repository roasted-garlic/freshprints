import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const here = path.dirname(fileURLToPath(import.meta.url));
const registerCustomerSource = readFileSync(path.join(here, "registerCustomer.ts"), "utf8");
const libSource = readFileSync(path.join(here, "lib/portalDevCustomerAccess.ts"), "utf8");
const indexSource = readFileSync(path.join(here, "index.ts"), "utf8");

describe("registerCustomer DEV allowlist gate contracts", () => {
  it("asserts allowlist on new registration and alreadyProvisioned paths", () => {
    assert.match(registerCustomerSource, /assertPortalDevCustomerAccessAllowsEmail/);
    const assertCalls = registerCustomerSource.match(
      /assertPortalDevCustomerAccessAllowsEmail/g,
    );
    assert.ok(assertCalls && assertCalls.length >= 2);
    assert.match(registerCustomerSource, /alreadyProvisioned:\s*true/);
  });

  it("production short-circuits via project-id enforcement helper", () => {
    assert.match(libSource, /isPortalDevCustomerAccessEnforcementEnabled/);
    assert.match(libSource, /PORTAL_DEV_CUSTOMER_ACCESS_ENFORCEMENT_PROJECT_ID/);
    assert.match(libSource, /GCLOUD_PROJECT/);
    assert.match(libSource, /GCP_PROJECT/);
    assert.match(libSource, /PORTAL_DEV_CUSTOMER_ACCESS_RESTRICTED_MESSAGE/);
    const constantsSource = readFileSync(
      path.join(
        here,
        "../../packages/shared/src/constants/portal/portalDevCustomerAccess.constants.ts",
      ),
      "utf8",
    );
    assert.match(constantsSource, /fresh-prints-dev/);
  });

  it("exports get/update/check callables", () => {
    assert.match(indexSource, /getPortalDevCustomerAccessSettings/);
    assert.match(indexSource, /updatePortalDevCustomerAccessSettings/);
    assert.match(indexSource, /checkPortalDevCustomerAccess/);
  });
});
