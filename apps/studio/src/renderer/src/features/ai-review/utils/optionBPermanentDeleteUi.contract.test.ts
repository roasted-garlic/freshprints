import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

describe("Option B permanent delete UI surfaces", () => {
  it("exposes Delete overflow menu on Processing / Needs Review / Rejected for owners", () => {
    const workspace = read(
      "apps/studio/src/renderer/src/features/ai-review/components/AiReviewWorkspace.tsx",
    );
    assert.match(workspace, /canPermanentlyDelete/);
    assert.match(workspace, /onPermanentlyDelete/);
    assert.match(workspace, /DangerOverflowMenu/);
    assert.match(workspace, /label:\s*"Delete"/);
    assert.match(workspace, /label:\s*"Multiple select"/);
    assert.match(workspace, /danger:\s*false/);
    assert.match(workspace, /onEnterMultiSelect/);
    assert.match(workspace, /ai-review-preview-overflow-menu/);
    assert.doesNotMatch(workspace, />\s*Permanently delete\s*</);

    const page = read("apps/studio/src/renderer/src/features/ai-review/pages/AiReviewPage.tsx");
    assert.match(page, /DeleteEligibleUnapprovedDesignDialog/);
    assert.match(page, /canDeleteEligibleUnapprovedDesigns/);
    assert.match(page, /isDeleteEligibleUnapprovedDesignStatus/);
    assert.match(page, /hardDeleteDesigns/);
    assert.match(page, /reconcileAfterHardDeleteSuccess/);
    assert.doesNotMatch(page, /await inbox\.reloadDesigns/);
    assert.match(page, /filters\.tab === "processing"/);
    assert.match(page, /filters\.tab === "needs_review"/);
    assert.match(page, /filters\.tab === "rejected"/);
    assert.match(page, /ai-review-multi-select-bar/);
    assert.match(page, /handleEnterMultiSelect/);
    assert.match(page, /handleCancelMultiSelect/);
    assert.match(page, /designsToHardDelete/);
    assert.match(page, /resolveAiReviewHardDeleteTargets/);
    assert.match(page, /designIds: designsToHardDelete\.map/);
    assert.match(page, /handleRangeMultiSelectDesign/);
    assert.match(page, /applyAiReviewMultiSelectRange/);
  });

  it("lists every selected title in a wider scrolling delete dialog", () => {
    const dialog = read(
      "apps/studio/src/renderer/src/features/designs/components/DeleteEligibleUnapprovedDesignDialog.tsx",
    );
    const modalCss = read("apps/studio/src/renderer/src/styles/components/modals.css");
    assert.match(dialog, /delete-eligible-unapproved-design-modal/);
    assert.match(dialog, /delete-eligible-unapproved-design-list-title/);
    assert.match(dialog, /title=\{label\}/);
    assert.doesNotMatch(dialog, /slice\(0,\s*12\)/);
    assert.match(modalCss, /delete-eligible-unapproved-design-modal\.modal-panel/);
    assert.match(modalCss, /width:\s*min\(100%,\s*44rem\)/);
    assert.match(modalCss, /max-height:\s*16rem/);
    assert.match(modalCss, /overflow-y:\s*auto/);
    assert.match(modalCss, /text-overflow:\s*ellipsis/);
  });

  it("does not expose Design Library ready-browse hard-delete selection chrome", () => {
    const library = read(
      "apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx",
    );
    assert.doesNotMatch(library, /Permanently delete \(/);
    assert.doesNotMatch(library, /selectedHardDeleteIds/);
    assert.doesNotMatch(library, /canDeleteEligibleUnapprovedDesigns/);
    // Archived purge checkboxes remain intentional.
    assert.match(library, /canPurgeArchivedDesignAssets/);
    assert.match(library, /selectedPurgeIds/);
  });

  it("keeps Print Request request-selection on DesignSelectionCard path", () => {
    const library = read(
      "apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx",
    );
    assert.match(library, /selectionModeActive/);
    assert.match(library, /requestSelection=\{selectionRequestSelection\}/);
    assert.doesNotMatch(
      library,
      /!includeArchived[\s\S]*canDeleteEligibleUnapprovedDesigns[\s\S]*purgeSelection/,
    );
  });

  it("does not add a separate delete callable — reuses deleteEligibleUnapprovedDesign", () => {
    const service = read(
      "apps/studio/src/renderer/src/features/designs/services/deleteEligibleUnapprovedDesignService.ts",
    );
    assert.match(service, /"deleteEligibleUnapprovedDesign"/);
    const page = read("apps/studio/src/renderer/src/features/ai-review/pages/AiReviewPage.tsx");
    assert.match(page, /useDeleteEligibleUnapprovedDesign/);
  });
});

describe("diagnostic-build release cleanliness", () => {
  it("renderer diagnostic flag is OFF unless VITE_FP_DERIVATIVE_LOCUS_DIAG=1", () => {
    const source = read(
      "apps/studio/src/renderer/src/shared/utils/derivativeLocusDiagnostic.ts",
    );
    assert.doesNotMatch(source, /import\.meta\.env\.DEV/);
    assert.match(source, /VITE_FP_DERIVATIVE_LOCUS_DIAG === "1"/);
  });

  it("electron diagnostic flag does not auto-enable on unpackaged local runs", () => {
    const source = read(
      "apps/studio/electron/services/import/derivativeLocusDiagnostic.ts",
    );
    assert.doesNotMatch(source, /!app\.isPackaged/);
    assert.match(source, /PACKAGED_DERIVATIVE_LOCUS_DIAG/);
    assert.match(source, /FP_DERIVATIVE_LOCUS_DIAG/);
  });

  it("diagnostic banner only renders when diagnostic flag is enabled", () => {
    const gate = read(
      "apps/studio/src/renderer/src/shared/components/DiagnosticProjectGate.tsx",
    );
    assert.match(gate, /DIAGNOSTIC BUILD/);
    assert.match(gate, /isDerivativeLocusDiagEnabled\(\)/);
    assert.match(gate, /diagnostic \? \(/);
  });

  it("packaged build config defaults PACKAGED_DERIVATIVE_LOCUS_DIAG to false", () => {
    const script = read("apps/studio/scripts/generate-packaged-build-config.mjs");
    assert.match(script, /STUDIO_DIAGNOSTIC_BUILD/);
    assert.match(
      script,
      /PACKAGED_DERIVATIVE_LOCUS_DIAG: boolean = \$\{diagnosticBuild \? "true" : "false"\}/,
    );
  });
});
