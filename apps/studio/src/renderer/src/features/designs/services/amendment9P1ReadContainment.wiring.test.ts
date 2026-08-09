import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

describe("Amendment 9 P1 import/approval read containment wiring", () => {
  it("threads createDesign authority into markDesignProcessing and skips processing getDesignById when known", () => {
    const orchestration = read(
      "apps/studio/src/renderer/src/features/imports/services/importOrchestrationService.ts",
    );
    const derivative = read(
      "apps/studio/src/renderer/src/features/imports/services/importDerivativeService.ts",
    );
    const ready = read(
      "apps/studio/src/renderer/src/features/designs/services/designReadyService.ts",
    );

    assert.match(orchestration, /knownAuthority:\s*designAuthority/);
    assert.match(derivative, /markDesignProcessing\(caller,\s*designId,\s*knownAuthority\)/);
    assert.match(ready, /knownAuthority\?: DesignAuthoritySnapshot/);
    assert.match(ready, /knownExistingData:\s*knownAuthority\.documentData/);
  });

  it("retains a fresh authority read after Storage for derivatives-complete (I4)", () => {
    const ready = read(
      "apps/studio/src/renderer/src/features/designs/services/designReadyService.ts",
    );
    assert.match(ready, /getDesignAuthoritySnapshot\(caller,\s*designId\)/);
    assert.match(ready, /knownExistingData:\s*authority\.documentData/);
    assert.match(ready, /I4 retained|fresh authority read/i);
  });

  it("passes draft updateDesign result into approveDesignForCatalog and retains apply getDoc (A3)", () => {
    const inbox = read(
      "apps/studio/src/renderer/src/features/ai-review/services/aiReviewInboxService.ts",
    );
    const approval = read(
      "apps/studio/src/renderer/src/features/designs/services/catalogApprovalService.ts",
    );
    const designService = read(
      "apps/studio/src/renderer/src/features/designs/services/designService.ts",
    );

    assert.match(
      inbox,
      /const draftUpdated = await designService\.updateDesign[\s\S]*approveDesignForCatalog\(caller,\s*designId,\s*draftUpdated\)/,
    );
    assert.match(approval, /knownDesign\?: Design/);
    assert.match(approval, /A3 retained/);
    assert.match(designService, /source: "designService\.applyCatalogApprovalUpdate"/);
    assert.match(
      designService,
      /traceFirestoreOneShotStart\("getDoc", applyReadTrace\)/,
    );
  });

  it("traces write-path getDoc for createDesign and updateDesign", () => {
    const designService = read(
      "apps/studio/src/renderer/src/features/designs/services/designService.ts",
    );
    assert.match(designService, /source: "designService\.createDesign"/);
    assert.match(designService, /source: "designService\.updateDesign"/);
    assert.match(designService, /knownExistingData\?: Record<string, unknown>/);
  });

  it("does not skip applyCatalogApprovalUpdate pre-write getDoc", () => {
    const designService = read(
      "apps/studio/src/renderer/src/features/designs/services/designService.ts",
    );
    // applyCatalogApprovalUpdate must not accept knownExistingData skip in this slice
    const applySection = designService.slice(
      designService.indexOf("async applyCatalogApprovalUpdate"),
      designService.indexOf("async applyReopenFromRejectedUpdate"),
    );
    assert.doesNotMatch(applySection, /knownExistingData/);
    assert.match(applySection, /await getDoc\(designRef\)/);
  });
});
