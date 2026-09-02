import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

describe("schedulePostAuthDeletionWarmup role gating (source contract)", () => {
  const source = read(
    "apps/studio/src/renderer/src/features/deletion/services/schedulePostAuthDeletionWarmup.ts",
  );

  it("gates each warmup callable behind the matching permissionService check", () => {
    assert.match(
      source,
      /canDeleteEligiblePrintRequest[\s\S]*previewPrintRequestDeletion/,
    );
    assert.match(
      source,
      /canDeleteEligibleUpcomingShow[\s\S]*previewUpcomingShowDeletion/,
    );
    assert.match(
      source,
      /canDeleteEligibleCustomerUpload[\s\S]*previewCustomerUploadDeletion/,
    );
    assert.match(
      source,
      /canDeleteEligibleUnapprovedDesigns[\s\S]*deleteEligibleUnapprovedDesign/,
    );
    assert.match(
      source,
      /canPurgeArchivedDesignAssets[\s\S]*purgeArchivedDesignAssets/,
    );
    assert.match(
      source,
      /canHardDeleteCustomerAccount[\s\S]*previewHardDeleteCustomerAccount/,
    );
    assert.match(source, /isStaff[\s\S]*previewShowProductionRecovery/);
  });

  it("returns empty list when user is null", () => {
    assert.match(source, /if \(!user\) \{\s*return \[\];/);
  });

  it("does not schedule a recurring timer\/keepalive loop", () => {
    assert.doesNotMatch(source, /setInterval/);
    assert.match(source, /requestIdleCallback|setTimeout/);
  });
});
