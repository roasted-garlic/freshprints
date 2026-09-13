import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../../../../../../..");

function readFromHere(relativePath: string): string {
  return readFileSync(path.join(here, relativePath), "utf8");
}

describe("customer print request quota override Studio surface", () => {
  it("Edit customer modal hosts Quota Override tab", () => {
    const modal = readFromHere("EditCustomerModal.tsx");
    assert.match(modal, /CustomerQuotaOverrideSection/);
    assert.match(modal, /Quota Override/);
    assert.match(modal, /activeTab === "quota"/);
  });

  it("Users directory shows clock-aware Quota Override badge", () => {
    const table = readFromHere("CustomerDirectoryTable.tsx");
    assert.match(table, /hasActivePrintRequestQuotaOverride/);
    assert.match(table, /Quota Override/);
  });

  it("quota override section uses shared TextInput and Checkbox with linked mode", () => {
    const section = readFromHere("CustomerQuotaOverrideSection.tsx");
    assert.match(section, /from "\.\.\/\.\.\/\.\.\/shared\/components\/TextInput"/);
    assert.match(section, /from "\.\.\/\.\.\/\.\.\/shared\/components\/Checkbox"/);
    assert.match(section, /from "\.\.\/\.\.\/\.\.\/shared\/components\/Button"/);
    assert.match(section, /Set independently/);
    assert.match(section, /Temporary quota/);
    assert.match(section, /Use global limits/);
    assert.match(section, /buildQuotaOverrideSavePayload/);
    assert.match(section, /resolveInitialCustomerQuotaOverrideEditMode/);
    assert.doesNotMatch(section, /settings-field-input/);
    assert.doesNotMatch(section, /linkPrintRequestAndCustomerShowLimits/);
  });

  it("permissionService gates mutate to owner via dedicated helper", () => {
    const permissionsPath = path.join(
      repoRoot,
      "apps/studio/src/renderer/src/features/permissions/services/permissionService.ts",
    );
    const permissions = readFileSync(permissionsPath, "utf8");
    assert.match(permissions, /canManageCustomerPrintRequestQuotaOverrides\(user: UserLike\)/);
    assert.match(
      permissions,
      /canManageCustomerPrintRequestQuotaOverrides[\s\S]{0,160}return isOwner\(user\)/,
    );
  });
});
