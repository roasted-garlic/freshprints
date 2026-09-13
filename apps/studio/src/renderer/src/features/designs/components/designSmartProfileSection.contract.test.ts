import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("Design Smart Profile Studio contracts", () => {
  it("DesignDetailsModal integrates Smart Catalog Profile section", () => {
    const source = readFileSync(
      join(__dirname, "DesignDetailsModal.tsx"),
      "utf8",
    );
    assert.match(source, /DesignSmartProfileSection/);
    assert.match(source, /DesignSmartProfileAuditSection/);
    assert.match(source, /canEditSmartProfile/);
    assert.match(source, /onSmartProfileUpdated/);
    assert.doesNotMatch(source, /smartProfileOverride/);
  });

  it("permissionService restricts edit to owner/admin", () => {
    const source = readFileSync(
      join(__dirname, "../../permissions/services/permissionService.ts"),
      "utf8",
    );
    assert.match(source, /canEditSmartProfile/);
    assert.match(source, /\["owner", "admin"\]/);
  });

  it("DesignSmartProfileSection shows pipeline status and edit gate", () => {
    const source = readFileSync(
      join(__dirname, "DesignSmartProfileSection.tsx"),
      "utf8",
    );
    assert.match(source, /resolveSmartProfilePipelineStatus/);
    assert.match(source, /Smart Catalog Profile/);
    assert.match(source, /design\.status === "ready"/);
    assert.match(source, /aiReviewStatus === "approved"/);
    assert.match(source, /Smart Profile: Missing/);
  });
});
