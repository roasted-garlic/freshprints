import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

describe("customer identity Studio UX contracts", () => {
  const tableSource = readFileSync(
    resolve(import.meta.dirname, "../components/CustomerDirectoryTable.tsx"),
    "utf8",
  );
  const editSource = readFileSync(
    resolve(import.meta.dirname, "../components/EditCustomerModal.tsx"),
    "utf8",
  );
  const hardDeleteSource = readFileSync(
    resolve(import.meta.dirname, "../components/HardDeleteCustomerConfirmDialog.tsx"),
    "utf8",
  );
  const updateHookSource = readFileSync(
    resolve(import.meta.dirname, "../../customers/hooks/useUpdateCustomerRecord.ts"),
    "utf8",
  );
  const userManagementPageSource = readFileSync(
    resolve(import.meta.dirname, "../pages/UserManagementPage.tsx"),
    "utf8",
  );

  it("shows disabled markers and re-enable affordances in the customer directory", () => {
    assert.match(tableSource, /Re-enable Account/);
    assert.match(tableSource, /danger: false/);
    assert.match(tableSource, /icon-button-success/);
    assert.match(tableSource, /isReversibleDisabledCustomer/);
    assert.doesNotMatch(tableSource, /customer-directory-row-disabled/);
    assert.match(tableSource, /Disable Account/);
    assert.match(tableSource, /Close Account Permanently/);
    assert.match(tableSource, /Delete Account Permanently/);
  });

  it("defaults customer directory to active-only visibility tabs", () => {
    assert.match(userManagementPageSource, /customerVisibilityTab/);
    assert.match(userManagementPageSource, /Active \(/);
    assert.match(userManagementPageSource, /Disabled \(/);
    assert.match(userManagementPageSource, /Closed \(/);
    assert.match(userManagementPageSource, /filterCustomersByVisibilityTab/);
  });

  it("uses condensed large edit customer modal layout", () => {
    assert.match(editSource, /size="lg"/);
    assert.match(editSource, /user-management-form-condensed/);
    assert.match(editSource, /Re-enable account/);
    assert.match(editSource, /variant="success"/);
    assert.match(editSource, /isReversibleDisabledCustomer/);
  });

  it("widens the change username modal", () => {
    const changeUsernameSource = readFileSync(
      resolve(import.meta.dirname, "../components/ChangeUsernameModal.tsx"),
      "utf8",
    );
    assert.match(changeUsernameSource, /size="md-lg"/);
  });

  it("renders structured hard-delete preview states", () => {
    assert.match(hardDeleteSource, /Loading deletion preview/);
    assert.match(hardDeleteSource, /allowed_hard_delete/);
    assert.match(hardDeleteSource, /outcome === "blocked"/);
  });

  it("surfaces propagation warnings after canonical username success", () => {
    assert.match(updateHookSource, /propagationWarning/);
    assert.match(updateHookSource, /Some historical records may still be updating/);
  });
});
