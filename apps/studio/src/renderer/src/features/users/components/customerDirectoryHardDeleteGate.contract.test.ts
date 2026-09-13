import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

describe("customer directory hard-delete production gate", () => {
  const tableSource = readFileSync(
    resolve(import.meta.dirname, "./CustomerDirectoryTable.tsx"),
    "utf8",
  );
  const gateSource = readFileSync(
    resolve(import.meta.dirname, "../../test-data-reset/utils/operationalWipeUiGate.ts"),
    "utf8",
  );
  const pageSource = readFileSync(
    resolve(import.meta.dirname, "../pages/UserManagementPage.tsx"),
    "utf8",
  );
  const permissionSource = readFileSync(
    resolve(import.meta.dirname, "../../permissions/services/permissionService.ts"),
    "utf8",
  );

  it("requires the DEV-only project/build gate before exposing hard delete", () => {
    assert.match(tableSource, /isOperationalWipeUiEnabled/);
    assert.match(tableSource, /const hardDeleteUiEnabled = isOperationalWipeUiEnabled\(\)/);
    assert.match(
      tableSource,
      /hardDeleteUiEnabled\s*&&\s*canHardDeleteCustomer\s*&&\s*onHardDeleteCustomer/,
    );
    assert.match(
      gateSource,
      /import\.meta\.env\.DEV\s*&&\s*isOperationalWipeAllowedProjectId/,
    );
  });

  it("cannot invoke the hard-delete preview workflow from a production customer directory", () => {
    assert.doesNotMatch(tableSource, /previewHardDeleteCustomerAccount/);
    assert.match(tableSource, /id: "hard-delete-customer"/);
    assert.match(tableSource, /onSelect: \(\) => onHardDeleteCustomer\(customer\)/);
  });

  it("preserves the owner requirement and reversible customer actions", () => {
    assert.match(pageSource, /permissionService\.canHardDeleteCustomerAccount\(user\)/);
    assert.match(
      permissionSource,
      /canHardDeleteCustomerAccount\(user: UserLike\)\s*\{\s*return isOwner\(user\)/s,
    );
    assert.match(tableSource, /label: "Disable Account"/);
    assert.match(tableSource, /label: "Re-enable Account"/);
    assert.match(tableSource, /label: "Close Account Permanently"/);
    assert.match(tableSource, /label: "Delete Account Permanently"/);
  });

  it("keeps the DEV-only hard-delete implementation source intact", () => {
    assert.match(tableSource, /onHardDeleteCustomer/);
    assert.match(gateSource, /isOperationalWipeAllowedProjectId/);
  });
});
