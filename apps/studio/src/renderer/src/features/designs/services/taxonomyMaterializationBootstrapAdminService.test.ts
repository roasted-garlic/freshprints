import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { isFirebaseDebugPanelEnabled } from "@fresh-prints/shared/utils/firebaseDebugPanelGate";

const SERVICE =
  "apps/studio/src/renderer/src/features/designs/services/taxonomyMaterializationBootstrapAdminService.ts";
const TYPES =
  "apps/studio/src/renderer/src/features/designs/services/freshPrintsDevConsole.types.ts";
const APP_SHELL = "apps/studio/src/renderer/src/shared/components/AppShell.tsx";

describe("taxonomyMaterializationBootstrapAdminService console gate", () => {
  it("reuses the Firebase Debug panel gate (dev + fresh-prints-dev only)", () => {
    assert.equal(
      isFirebaseDebugPanelEnabled({ isDevelopmentBuild: true, projectId: "fresh-prints-dev" }),
      true,
    );
    assert.equal(
      isFirebaseDebugPanelEnabled({ isDevelopmentBuild: false, projectId: "fresh-prints-dev" }),
      false,
    );
    assert.equal(
      isFirebaseDebugPanelEnabled({ isDevelopmentBuild: true, projectId: "fresh-prints-prod" }),
      false,
    );
    assert.equal(isFirebaseDebugPanelEnabled({ isDevelopmentBuild: true, projectId: "" }), false);
  });

  it("wires callTracedFunction to rebuildTaxonomyMaterializationCallable with 540s timeout", () => {
    const source = readFileSync(SERVICE, "utf8");
    assert.match(source, /callTracedFunction/);
    assert.match(source, /"rebuildTaxonomyMaterializationCallable"/);
    assert.match(source, /timeout:\s*540_000/);
    assert.match(source, /isFirebaseDebugPanelEnabled/);
    assert.match(source, /import\.meta\.env\.DEV/);
  });

  it("install is a no-op when gate is disabled and does not invoke the callable", () => {
    const source = readFileSync(SERVICE, "utf8");
    assert.match(
      source,
      /if \(!isTaxonomyMaterializationBootstrapConsoleEnabled\(\)\) \{\s*return \(\) => undefined;/,
    );
    // install only assigns the function reference — never calls rebuildTaxonomyMaterialization()
    const installBlock = source.slice(source.indexOf("export function installTaxonomyMaterializationBootstrapAdminConsole"));
    assert.doesNotMatch(installBlock, /rebuildTaxonomyMaterialization\(\)/);
    assert.match(installBlock, /rebuildTaxonomyMaterialization,/);
  });

  it("cleanup deletes only rebuildTaxonomyMaterialization", () => {
    const source = readFileSync(SERVICE, "utf8");
    assert.match(source, /delete window\.freshPrintsDev\.rebuildTaxonomyMaterialization;/);
    assert.doesNotMatch(source, /delete window\.freshPrintsDev\.reconcilePortalCatalogAlgoliaIndex/);
    assert.doesNotMatch(source, /delete window\.freshPrintsDev\.backfillPrintRequestQueueTab/);
  });

  it("types expose rebuildTaxonomyMaterialization without removing existing methods", () => {
    const types = readFileSync(TYPES, "utf8");
    assert.match(types, /rebuildTaxonomyMaterialization\?:/);
    assert.match(types, /backfillPrintRequestQueueTab\?:/);
    assert.match(types, /reconcilePortalCatalogAlgoliaIndex\?:/);
  });

  it("AppShell installs and uninstalls alongside existing bridges", () => {
    const shell = readFileSync(APP_SHELL, "utf8");
    assert.match(shell, /installTaxonomyMaterializationBootstrapAdminConsole/);
    assert.match(shell, /uninstallTaxonomyBootstrap/);
    assert.match(shell, /installPortalCatalogAlgoliaReconcileAdminConsole/);
    assert.match(shell, /installPrintRequestQueueTabBackfillAdminConsole/);
  });
});
