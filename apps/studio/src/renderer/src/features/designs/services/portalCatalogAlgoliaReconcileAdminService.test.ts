import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { isFirebaseDebugPanelEnabled } from "@fresh-prints/shared/utils/firebaseDebugPanelGate";

describe("portalCatalogAlgoliaReconcileAdminService console gate", () => {
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
  });

  it("wires a 540s client timeout matching the Function timeoutSeconds", () => {
    const service = readFileSync(
      "apps/studio/src/renderer/src/features/designs/services/portalCatalogAlgoliaReconcileAdminService.ts",
      "utf8",
    );
    const server = readFileSync(
      "functions/src/algolia/reconcilePortalCatalogAlgoliaIndex.ts",
      "utf8",
    );
    assert.match(service, /timeout:\s*540_000/);
    assert.match(server, /timeoutSeconds:\s*540/);
    assert.match(service, /reconcilePortalCatalogAlgoliaIndex/);
  });
});
