/**
 * Studio contract: Reprocess with AI surface + permission.
 * Run from repo root:
 *   npx tsx --test apps/studio/src/renderer/src/features/designs/components/reprocessReadyDesignWithAi.contract.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(rel: string): string {
  return readFileSync(rel, "utf8");
}

describe("Studio Reprocess with AI contracts", () => {
  it("permission is owner-only", () => {
    const src = read(
      "apps/studio/src/renderer/src/features/permissions/services/permissionService.ts",
    );
    assert.match(src, /canReprocessReadyDesignWithAi/);
    assert.match(
      src,
      /canReprocessReadyDesignWithAi\(user: UserLike\) \{\s*\n\s*return isOwner\(user\);/,
    );
  });

  it("Design Details exposes Reprocess with AI for Ready designs in the footer next to Download", () => {
    const modal = read(
      "apps/studio/src/renderer/src/features/designs/components/DesignDetailsModal.tsx",
    );
    assert.match(modal, /canReprocessReadyDesignWithAi/);
    assert.match(modal, /status === "ready"/);
    assert.match(modal, /aiReviewStatus === "approved"/);
    const footerStart = modal.indexOf('className="design-details-footer-actions"');
    assert.ok(footerStart >= 0, "footer actions container missing");
    const footerActions = modal.slice(footerStart, footerStart + 800);
    assert.match(footerActions, /Reprocess with AI/);
    assert.match(footerActions, /Download/);
    const actionStack = modal.slice(
      modal.indexOf('className="design-details-action-stack"'),
      modal.indexOf('className="design-details-footer"'),
    );
    assert.doesNotMatch(actionStack, /Reprocess with AI/);
  });

  it("Design Library immediately drops reprocessed designs from managed search + exact-id cache", () => {
    const library = read(
      "apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx",
    );
    const handler = library.slice(
      library.indexOf("onReprocessedWithAi={(designId) => {"),
      library.indexOf("onRestore={handleRestoreDesign}"),
    );
    assert.match(handler, /removeDesignFromList\(designId\)/);
    assert.match(handler, /applyManagedSearchPatch\(/);
    assert.match(handler, /status: "imported"/);
    assert.match(handler, /aiReviewStatus: "pending"/);
    assert.match(handler, /setExactIdDesign/);
  });

  it("confirmation modal has no typed phrase requirement", () => {
    const dialog = read(
      "apps/studio/src/renderer/src/features/designs/components/ReprocessReadyDesignWithAiConfirmDialog.tsx",
    );
    assert.match(dialog, /Reprocess with AI\?/);
    assert.doesNotMatch(dialog, /type.*SEND TO AI/i);
    assert.doesNotMatch(dialog, /confirmationPhrase/);
  });

  it("client service calls reprocessReadyDesignWithAi callable", () => {
    const svc = read(
      "apps/studio/src/renderer/src/features/designs/services/designReprocessWithAiService.ts",
    );
    assert.match(svc, /"reprocessReadyDesignWithAi"/);
    assert.match(svc, /canReprocessReadyDesignWithAi/);
  });

  it("approve path preserves existing readyAt", () => {
    const designService = read(
      "apps/studio/src/renderer/src/features/designs/services/designService.ts",
    );
    assert.match(designService, /existingData\.readyAt == null/);
  });
});
